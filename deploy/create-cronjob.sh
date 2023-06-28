#!/bin/bash
# Add a cronjob for the DTaaS services to the current users crontab
# the actual crontab script is cron.sh
# all existing crontab jobs are retained

if [ -n "$1" ]; then
  PROJECT_PATH="$1"
else
  PROJECT_PATH="$(pwd)"
fi

export PROJECT_PATH

printf "Existing crontab for the user\n"
crontab -l
crontab -l | sort -u  > temp.cron
echo "* * * * * ${PROJECT_PATH}/deploy/cron.sh ${PROJECT_PATH}" >> temp.cron
sort -u temp.cron > jobs.cron
crontab jobs.cron
rm jobs.cron temp.cron
printf "Updated crontab for the user\n"
crontab -l