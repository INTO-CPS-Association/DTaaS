#!/bin/bash
# remove the default route installed by vagrant

crontab -l | sort -u  > temp.cron
echo "* * * * * ip route del default via 10.0.2.2 dev enp0s3" >> temp.cron
cat temp.cron | sort -u > jobs.cron
crontab jobs.cron
rm jobs.cron temp.cron
