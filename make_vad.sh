#!/bin/sh

# FIXME: check if vadpacker is installed
# Path to the vadpacker tool
VADPACKER=vadpacker.py

VERSION="0.3"

# Additional file list
FILES=`find . -name "*.css" -or -name "*.js" -or -name "*.png" -or -name "*.gif"`

$VADPACKER -o ods-console-$VERSION.vad -t "ods-console/" --var="VERSION=$VERSION" ods-console-sticker.xml $FILES
