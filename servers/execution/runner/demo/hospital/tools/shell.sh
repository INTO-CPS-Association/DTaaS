#!/usr/bin/env bash
# Shell functions of the hospital demo, sourced before each command

# dt URL PATH [CURL OPTIONS]: an HTTP request to the runner of DT_ID at
# URL, with the reply as compact JSON and its HTTP status on the last
# line. With the keys of record.mjs, it is signed as alice
# (tools/sign.mjs); curl's -X and --json give the method and the body
# that the signature covers.
dt() {
  local url=$1 path=$2 method=GET body='' option
  shift 2
  local options=("$@")
  while [[ $# -gt 0 ]]; do
    option=$1
    shift
    case $option in
      -X) method=$1 ;;
      --json) body=$1 && [[ $method == GET ]] && method=POST ;;
      *) ;;
    esac
  done
  # Git Bash would turn the path into a Windows path for node
  local auth
  auth=$(MSYS_NO_PATHCONV=1 node tools/sign.mjs http "$method" "$path" "$body")
  if [[ -n $auth ]]; then
    options+=(-H "Authorization: $auth")
  fi
  curl -s -w '\n%{http_code}' "${options[@]}" "$url$path" | node tools/pp.mjs
  return $?
}

# mq ROUTE [JSON]: an MQTT request to the runner of DT_ID and its
# response; mq retained: the retained notifications of every DT
mq() {
  node tools/mq.mjs "$@"
  return $?
}

# The same for each hospital: dt1 and mq1 ask hospital-1, dt2 and mq2
# hospital-2
dt1() { DT_ID=hospital-1 dt http://localhost:5100 "$@"; }
dt2() { DT_ID=hospital-2 dt http://localhost:5200 "$@"; }
mq1() { DT_ID=hospital-1 mq "$@"; }
mq2() { DT_ID=hospital-2 mq "$@"; }
