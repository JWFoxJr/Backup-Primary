Automated TableaU Server Backup Primary Failover POC
=========

This is sample code, and is not supported by Tableau. Please be kind and don't call Technical Support for help - they don't know what this is!

What does it do?

  - Shows you that it ain't that hard to automatically have your Backup Primary take over when and if the Primary fails
  - Allows you to configure Primary & Backup Primary hostnames or ip addresses
  - Lets you configure the number of consecutive connection failures in 60 seconds before failover
  - Enables you to set the interval at which we check to see if the Primary is still alive


Version
----

1.0



Installation
--------------

 - To begin, you must download and install [Node.Js] for your Backup Primary
 - Next, download the code using the **Download ZIP** button to your upper-right
 - Unzip to c:\<somefolder>, and navigate there on the command-line.
 - Execute these commands to prepare the app
 
```sh
npm install 
```

##### Note: 
Windows only. Deal with it. 
  
  
To run the application, type:

```sh
node app
```
Keep in mind that the machine on which the backup primary (and this app) are installed must be running. Per best practices, I assume that Tableau Server will not be active on the backup primary. In fact, the code assumes it needs to re-enable the (best practices) generally disabled (tabsvc) Tableau Server windows service.

App  Configuration
-----------

In c:\<somefolder>\app.js modify:
 - Line  6: primary - set to the IPv4 address or hostname of your primary
 - Line  8: backupPrimary - same exercise, but for your backup primary
 - Line 10: numberFailures -  How many failures in a row within 60 seconds will cause failover to occur?
 - Line 12: pingInterval - What portion of a minute (decimal) is the interval for checking to make sure the primary is alive?
 

License
----

MIT

FAQs / Notes
----

##### How does it work?
This thing is dead simple. It runs on your backup primary. It pings your primary every pingInterval seconds, attempting to retrieve /fav.icon from the primary's gateway. If we can't get to the box, or can't grab the icon, that's a "failure". 

You can have up to numberFailures in 60 seconds before the code running on the backup primary tries to make it the primary. It executes the following commands for you:

tabadmin failoverprimary --primary "<backup>,<primary>"
sc config tabsvc start= auto
tabadmin restart
 
 
#####Help! I can't this running! I see an error or something! I need technical support! 
 Sorry about that, but this is a proof-of-concept sample application - not something that is production ready. It isn't supported by Tableau. In a pinch you might get someone in the [Tableau Developer Community] to give you a push in the right direction, however.
 

[Node.js]:http://nodejs.org/
[Tableau Developer Community]:http://community.tableausoftware.com/groups/dev-community
