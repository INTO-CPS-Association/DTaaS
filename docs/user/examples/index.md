# DTaaS Examples

There are some example digital twins created for the DTaaS software.
These examples are hosted in a dedicated
[DTaaS examples github repository](https://github.com/INTO-CPS-Association/DTaaS-examples).

Use the examples and follow the steps given in the **Examples** section to experience
features of the DTaaS software platform and understand best practices for managing
digital twins within the platform.

## Copy Examples

The first step is to copy all the example code into your
user workspace within the DTaaS.
Use these shell commands to copy all the examples
into `/workspace/examples` directory.

```bash
#!/bin/bash
cd /root/Desktop/
wget -P workspace https://github.com/INTO-CPS-Association/DTaaS-examples/archive/refs/heads/main.zip
unzip workspace/main.zip -d workspace
mv workspace/DTaaS-examples-main workspace/examples
rm workspace/main.zip
```

## Example List

The digital twins provided in examples vary in their complexity. It is best
to use the examples in the following order.

1. [Mass Spring Damper](./mass-spring-damper/README.md)
