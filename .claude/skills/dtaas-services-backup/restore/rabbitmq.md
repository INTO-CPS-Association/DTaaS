# Restore: rabbitmq (4.2.2 -> 4.4.0)

Input: `rabbitmq/definitions.json` (+ `rabbitmq.conf`, `enabled_plugins`, `queues.txt` for reference).

1. `dtaas-services service start -s rabbitmq`, wait until
   `docker exec rabbitmq rabbitmq-diagnostics -q check_running` succeeds.
2. `docker exec -i rabbitmq rabbitmqctl import_definitions - < rabbitmq/definitions.json`
   (`-i` is required; without it, nothing is imported). Users keep their source password hashes.
3. Compare the source `rabbitmq.conf` / `enabled_plugins` with the target's (e.g. the MQTT plugin) and tell the
   user about differences. Don't overwrite the target files without asking.
4. Verify: the vhost/user/queue counts in `definitions.json` against `rabbitmqctl list_vhosts|list_users|list_queues -p <v>`,
   `rabbitmqctl list_permissions -p <vhost>`, and an AMQPS/MQTTS connection as a source user.
5. Queued messages were not backed up (`queues.txt` shows counts). Tell the user which were non-zero.
