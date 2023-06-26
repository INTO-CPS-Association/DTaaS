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

crontab -l | sort -u  > temp.cron
echo "* * * * * ${PROJECT_PATH}/deploy/cron-path.sh ${PROJECT_PATH}" >> temp.cron
cat temp.cron | sort -u > jobs.cron
crontab jobs.cron
rm jobs.cron temp.cron