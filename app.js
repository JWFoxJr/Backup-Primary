var exec = require('child_process').spawn;
var Monitor = require('ping-monitor');

// Info about your environment
    //Name of your Primary 
    var primary = "10.211.55.8";
    //Name of your Backup Primary
    var backupPrimary = "10.211.55.6";
    // Number of CONSECUTIVE connection failures within 60 seconds before failover  
    var numberFailures = 3;
    // Ping interval in minutes. Make sure pingInterval * numberFailures <=1
    var pingInterval = .25
    

// Other variables
var errorCount = 0;
var currentTime = Date.now(); 


// ================= Monitoring code
var sitexmonitor = new Monitor({
    
    // Request the happy little Tableau icon that shows up in the upper corner of your browser tab
    // As long as we get a response, we know the gateway on the primary is happy.
    
    website: 'http://' + primary + '/favicon.ico',
    timeout: pingInterval
});


// Executed when we stop monitoring original Tableau Primary
sitexmonitor.on('stop', function (website) {
    console.log('No longer monitoring Primary.\n');
});
// All is well. 
sitexmonitor.on('up', function (res) {
    console.log('Yay!! ' + primary + ' is happy.');
    errorCount=0;
});
// This will never get hit, coding for it anyway 
sitexmonitor.on('down', function (res) {
    console.log('Ugh. ' + res.website + ' is down! ' + res.statusMessage);
});
 // This event is required to be handled in all Node-Monitor instances
sitexmonitor.on('error', function (res) {

        //Is this the first error we've seen? If so, set the current time. 
        if (errorCount == 0) {
            errorTime = Date.now();
        }

        errorCount += 1;
        errorPeriod = Math.round((Date.now() - errorTime) / 1000);
       
        // Since node does its work asynchronously, there may be additional requests that have't been been processed
        // when we hit the max numberFailures value and begin a failover. If this occurs, let's not log the 
        // additional failures we might see as they really aren't relevant and might confuse folks
        if (errorCount <= numberFailures) {
            console.log('Error loading ' + res.website + '! Error', errorCount, ' of ', numberFailures, ' within the last ', errorPeriod, ' sec');
        }

        // Begin backup primary failover if we have hit or exceeded max consecutive errors allowed in 60 seconds
        if (errorPeriod <= 60 && errorCount == numberFailures) {
            console.log('Error count exceeded. Beginning failover');
            sitexmonitor.stop();
            //Failover
            failOver(function (result) {
                    
                 // Executing failoverprimary failed
                    if (result != 0) {
                       console.log ("Attempt to switch primary and backup failed. Sorry, this script is quite embarrassed");
                       process.exit(1);
                    }
                    console.log('SUCCESS.\n');
                
                    // Re-enable Tableau Windows Service
                    enableTableau(function (result) {
                        if (result != 0) {
                           console.log ("Attempt to re-enable Windows Service failed. Sorry, this script is quite embarrassed");
                           process.exit(1);
                        }
                    });
                
                    // Start Tableau
                    
                    // Being picky & cheesy, but don't want this to execute till the "SUCCESS" message comes back from enabling the 
                    // SC command.
                    setTimeout(function() {
                        startTableau(function (result) {
                            if (result != 0) {
                               console.log ("Attempt to restart Tableau Server failed. Sorry, this script is quite embarrassed");
                               process.exit(1);
                            }
                        });
                    },1000);           
                   
            });
            
        }
    
});
 
 


// ============== Failover code

// Execute failoverprimary via Tabadmin
failOver = function (callback) {

    try {
        argArray = [];
        argArray.push('failoverprimary');
        argArray.push('--primary');
        argArray.push(backupPrimary + ',' + primary);

        console.log('===== Executing Tabadmin to swap in Backup Primary: tabadmin ' + argArray.join(" "));
        spawn = exec('tabadmin.exe', argArray);
    } catch (e) {
        console.log(e);
    }

    spawn.stdout.on('data', function (data) {
        console.log('stout: ' + data);
        callback(0);
    });


    spawn.stderr.on('data', function (data) {
        console.log('sterr failoverprimary: ' + data);
        callback(1);
    });

    spawn.on('close', function (code) {
        callback(0);
    });
}

// Re-enable the Tableau Service
enableTableau = function (callback) {

    try {
        argArray = [];
        argArray.push('config');
        argArray.push('tabsvc');
        argArray.push('start=');
        argArray.push('auto');

        console.log("===== Attempting to re-enable Tableau's Windows Service");
        spawn = exec('sc.exe', argArray);
    } catch (e) {
        console.log(e);
    }

    spawn.stdout.on('data', function (data) {
        console.log(data.toString());
        callback(0);
    });


    spawn.stderr.on('data', function (data) {
        console.log('sterr enableTableau: ' + data);
        callback(1);
    });

    spawn.on('close', function (code) {
        callback(code);
    });
}

// Start Tableau Server
startTableau = function (callback) {

    try {
        argArray = [];
        argArray.push('restart');


        console.log("===== Attempting to restart Tableau Server");
        spawn = exec('tabadmin.exe', argArray);
    } catch (e) {
        console.log(e);
    }

    spawn.stdout.on('data', function (data) {
        console.log(data.toString());
        callback(0);
    });


    spawn.stderr.on('data', function (data) {
        console.log('sterr startTableau: ' + data);
        callback(1);
    });

    spawn.on('close', function (code) {
        callback(code);
    });
}


// ============= Helper functions

getFormattedDate = function (time) {
    var currentDate = new Date(time);

    currentDate = currentDate.toISOString();
    currentDate = currentDate.replace(/T/, ' ');
    currentDate = currentDate.replace(/\..+/, '');

    return currentDate;
};
