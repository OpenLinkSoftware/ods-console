#!/bin/sh

# All settings are hard-coded, this is the very definition of non-portable. :P

tar czf - --exclude *~ --exclude web-ods-dox-upload.sh * | ssh web.ods.openlinksw.com tar xzf - -C /opt/virtuoso/vsp/ods-console/
