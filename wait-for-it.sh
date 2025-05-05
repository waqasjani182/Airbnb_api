#!/bin/bash
# wait-for-it.sh: Wait for a service to be available
# Usage: ./wait-for-it.sh host:port [-t timeout] [-- command args]

WAITFORIT_cmdname=${0##*/}
WAITFORIT_timeout=15
WAITFORIT_quiet=0
WAITFORIT_host=""
WAITFORIT_port=""
WAITFORIT_result=0
WAITFORIT_STRICT=0

function echoerr { if [[ $WAITFORIT_quiet -ne 1 ]]; then echo "$@" 1>&2; fi }

function usage {
    cat << USAGE >&2
Usage:
    $WAITFORIT_cmdname host:port [-t timeout] [-- command args]
    -q | --quiet                        Don't output any status messages
    -t TIMEOUT | --timeout=TIMEOUT      Timeout in seconds, zero for no timeout
    -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
    exit 1
}

# Process arguments
while [[ $# -gt 0 ]]
do
    case "$1" in
        *:* )
        WAITFORIT_hostport=(${1//:/ })
        WAITFORIT_host=${WAITFORIT_hostport[0]}
        WAITFORIT_port=${WAITFORIT_hostport[1]}
        shift 1
        ;;
        -q | --quiet)
        WAITFORIT_quiet=1
        shift 1
        ;;
        -t)
        WAITFORIT_timeout="$2"
        if [[ $WAITFORIT_timeout == "" ]]; then break; fi
        shift 2
        ;;
        --timeout=*)
        WAITFORIT_timeout="${1#*=}"
        shift 1
        ;;
        --)
        shift
        WAITFORIT_CLI=("$@")
        break
        ;;
        --help)
        usage
        ;;
        *)
        echoerr "Unknown argument: $1"
        usage
        ;;
    esac
done

if [[ "$WAITFORIT_host" == "" || "$WAITFORIT_port" == "" ]]; then
    echoerr "Error: you need to provide a host and port to test."
    usage
fi

function wait_for {
    if [[ $WAITFORIT_timeout -gt 0 ]]; then
        echoerr "Waiting $WAITFORIT_timeout seconds for $WAITFORIT_host:$WAITFORIT_port"
    else
        echoerr "Waiting for $WAITFORIT_host:$WAITFORIT_port without a timeout"
    fi
    WAITFORIT_start_ts=$(date +%s)
    while :
    do
        if [[ $WAITFORIT_timeout -gt 0 && ($(date +%s) - $WAITFORIT_start_ts) -gt $WAITFORIT_timeout ]]; then
            echoerr "Timeout occurred after waiting $WAITFORIT_timeout seconds for $WAITFORIT_host:$WAITFORIT_port"
            WAITFORIT_result=1
            break
        fi
        nc -z $WAITFORIT_host $WAITFORIT_port >/dev/null 2>&1
        WAITFORIT_result=$?
        if [[ $WAITFORIT_result -eq 0 ]]; then
            echoerr "$WAITFORIT_host:$WAITFORIT_port is available after $(($(date +%s) - $WAITFORIT_start_ts)) seconds"
            break
        fi
        sleep 1
    done
    return $WAITFORIT_result
}

wait_for
WAITFORIT_RESULT=$?

if [[ $WAITFORIT_CLI ]]; then
    if [[ $WAITFORIT_RESULT -ne 0 && $WAITFORIT_STRICT -eq 1 ]]; then
        echoerr "$WAITFORIT_cmdname: strict mode, refusing to execute subprocess"
        exit $WAITFORIT_RESULT
    fi
    exec "${WAITFORIT_CLI[@]}"
else
    exit $WAITFORIT_RESULT
fi
