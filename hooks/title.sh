#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec node --no-warnings "$DIR/../dist/title.js"
