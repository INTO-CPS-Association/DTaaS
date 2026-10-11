#!/bin/bash
# remove the default route installed by vagrant

printf "Existing crontab for root\n"
crontab -l
crontab -l | sort -u >temp.cron
echo "* * * * * ip route del default via 10.0.2.2 dev enp0s3" >>temp.cron
sort -u temp.cron >jobs.cron
crontab jobs.cron
rm jobs.cron temp.cron
printf "Updated crontab for root\n"
crontab -l
