#!/bin/bash
# Remove the incorrect routing path
ip route del default via 10.0.2.2 dev enp0s3
