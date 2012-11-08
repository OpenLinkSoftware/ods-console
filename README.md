# The ODS Console

[ODS](http://web.ods.openlinksw.com/) has a comprehensive HTTP API. To easy testing and development the ODS Console can be used to initiate calls to any of the API functions through a simple UI.


## Installation

The ODS Console can be installed on any system to access any ODS instance given that the domain of the Console installation has been added to the ODS instance as a client (See also [admin.client.new](http://web.ods.openlinksw.com/odsdox/group__ods__module__admin.html#ga675af873f023acb812a8d7694a1d3b9f)).

ODS Console is a pure client-side JS application which can be run from any location including a local folder or [OpenLink's own test installation of ODS Console](http://web.ods.openlinksw.com/ods-console/). By default the console will access the ODS installation on the same domain. However, if the host of the Console installation has been added as a client to the ODS instance (See [`admin.client.new`](http://web.ods.openlinksw.com/odsdox/group__ods__module__admin.html#ga675af873f023acb812a8d7694a1d3b9f) it can be used to access the API of the ODS instance by simply setting the ODS host in the Console configuration:

![ODS Console Config Dlg](http://web.ods.openlinksw.com/odsdox/ods-console-cfg.png)

The ODS API is always accessible at path `/ods/api`. This path should not be included in the configuration setting as ODS Console will add it automatically.

See also: http://web.ods.openlinksw.com/odsdox/ods_console.html.
