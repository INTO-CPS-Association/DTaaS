# Signals Gateway Service Users

The gateway reads RabbitMQ and InfluxDB with credentials that can only read.
A leaked gateway credential therefore cannot publish a signal, declare a queue
outside the gateway's own prefix, or write a point.

## The RabbitMQ Service User

The gateway connects as one service user, `dtaas-signals` by default, to the
vhost of each twin's owner. In every vhost the user may:

| Permission | Pattern | Meaning |
| :--- | :--- | :--- |
| Configure | `^dtaas-signals\..*` | Declare and bind only its own queues, named `dtaas-signals.<uuid>` |
| Write | `^dtaas-signals\..*` | Bind only to its own queues |
| Read | `^(amq\.topic\|dtaas-signals\..*)$` | Read `amq.topic`, where the MQTT plugin publishes, and its own queues |
| Topic write on `amq.topic` | `^$` | Publish under no routing key |
| Topic read on `amq.topic` | `.*` | Bind any topic. The gateway decides for each user which topics it serves |

### With the DTaaS Services CLI

Set the name of the user in `config/services.env` of the
[platform services](../../services/cli.md):

```bash
SIGNALS_RABBITMQ_USER=dtaas-signals
```

Then create the user and grant it on every existing vhost. The command reads
the password from a file, or prompts for it when `--password-file` is left
out, so the password never appears in the shell history or the process list:

```bash
dtaas-services user add-signals --password-file signals-password
```

From then on, `dtaas-services user add` grants the user on each new user vhost.
The grant also covers the default vhost `/` when it exists. A user that already
exists keeps its password.

### With rabbitmqctl

`rabbitmqctl` prompts for the password when it is left out:

```bash
rabbitmqctl add_user dtaas-signals
rabbitmqctl set_permissions -p <vhost> dtaas-signals \
  '^dtaas-signals\..*' '^dtaas-signals\..*' '^(amq\.topic|dtaas-signals\..*)$'
rabbitmqctl set_topic_permissions -p <vhost> dtaas-signals amq.topic '^$' '.*'
```

Run the last two commands for each vhost. Write the password to the file that
`rabbitmq-password-file` names, readable only by the user that runs the
gateway.

## The InfluxDB Read-Only Tokens

The DTaaS services CLI creates one org and one bucket for each user, both named
after the user. For each org, create a token that can only read that bucket.
In the `influxdb` container of the platform services:

```bash
docker exec influxdb influx bucket find --org <org> --name <bucket> --skip-verify
docker exec influxdb influx auth create --org <org> \
  --read-bucket <bucket-id> --description "dtaas-signals read <org>" \
  --skip-verify
```

`--skip-verify` matches the commands the DTaaS services CLI runs in the same
container. The second command prints the token once.
Collect the tokens in the file that `influx-tokens-file` names, one entry for
each org:

```json
{ "alice": "<read-only token of alice>" }
```

Keep the file readable only by the user that runs the gateway, and do not
commit it.
