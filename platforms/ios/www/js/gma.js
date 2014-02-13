/**
 * This is the app controller for Mobile GMA.
 *
 * Dependencies:
 *      - jQuery
 *      - gma-api.js
 *      - Settings.js
 *      - Page.js
 *      - ReportSet.js
 */

// Global GMA object to be initialized at login
var gma;


// Use PhoneGap's notification API if available
var _alert = function (message, title) {
    if (message == 'error: 404') {
        message = "Make sure your VPN and server settings are correct";
    }

    if (navigator.notification) {
        navigator.notification.alert(
            message,
            function() {},
            title || "Notice",
            "OK"
        );
    } else {
        if (title) {
            message = title + ':\n' + message;
        }
        alert(message);
    }
 };

// Handler for GMA service call errors
var errorHandler = function (err) {
    console.log(err);
    
    // On session timeout, reset back to the login page
    if (err && err.message && err.message.match(/session timed out/i)) {
        _alert("Please log in again", 'Session timed out');
        Page.popAll();
    }
    else if (err && err.message) {
        _alert(err.message, 'Error');
    }
    else if (typeof err == "string") {
        _alert(err, 'Error');
    }
    else {
        _alert("Sorry, there was an error");
    }
}



var startGMA = function () {
    
    // Show the first page
    Page.init();
    Page.list['login-page'].push();

    
    ///////////////////////////////
    //    CUSTOM SETTINGS PAGE   //
    ///////////////////////////////
    
    // Handle the "Next" button
    $('#custom-settings-page button').on('click', function(){
        Settings.setCustomProfile({
            gmaBase: $('#custom-gma-server').val(),
            casURL: $('#custom-cas-server').val(),
            label: 'Custom server'
        });
        
        // Dismiss and to return to the login page
        Page.pop();
    });



    /////////////////////
    //    LOGIN PAGE   //
    /////////////////////
    
    // Populate the GMA server list
    var $serverList = $('#gma-server-list');
    var profiles = Settings.getProfileLabels();
    $serverList.empty();
    for (var key in profiles) {
        $serverList.append(
            '<option value="' + key + '">' +
            profiles[key] +
            '</option>'
        );
    }
    $serverList.selectmenu("refresh");
    
    // Show the custom settings page when "Custom..." is selected from the list
    $('#gma-server-list').on('change', function(){
        var profileKey = $(this).val();

        if (profileKey == 'custom') {
            Page.list['custom-settings-page'].push();
        }
        
        Settings.currentProfile = profileKey;
    });

    // Logging in
    $('#login-button').on('click', function(){
        
        // Init the GMA object based on the selected profile
        gma = new GMA({
            gmaBase: Settings.getGmaBase(),
            casURL: Settings.getCasUrl(),
            showBusyAnim: function(){
                $.mobile.loading("show");
            },
            hideBusyAnim: function(){
                $.mobile.loading("hide");
            }
        });
        
        // Disable widgets while communicating with server
        $('#login-page').find('input,button,select').attr('disabled', 'true');
        
        gma.login($('#cas-username').val(), $('#cas-password').val())
        .fail(function(err){
            _alert(err.message || '', 'Login failure');
        })
        .always(function(){
            // Re-enable widgets when done
            $('#login-page').find('input,button,select').removeAttr('disabled');
        })
        .then(function(){
            // Return to previous page, if there is one
            if (Page.stack.length > 1) {
                Page.pop();
            }
            // Otherwise move on to the Assignments page
            else {
                
                // Populate the assignment list
                showAssignments();
                
            }
            // Clear the password field
            $('#cas-password').val('');
        });
        
    });
    
    
    

    //////////////////////////////
    //    ASSIGNMENTS PAGE     //
    /////////////////////////////
    
    var reports;
    
    var showAssignments = function () {
        // Populate the assignments list
        var $list = $('#assignments-page ul');
        $list.empty();
        gma.getAssignments()
        .fail(errorHandler)
        .then(function(byID, byName) {
            var count = 0;
            for (var nodeID in byID) {
                var nodeName = byID[nodeID];
                $list.append('<li><a href="#" node-id="' + nodeID + '">' + nodeName + '</a></li>');
                count += 1;
            }
            if (count == 0) {
                errorHandler(new Error("No assignments found"));
            }
            else {
                $list.listview('refresh');
                // Show the assignments page
                Page.list['assignments-page'].push();
            }
        });
    }
    
    
    // Handle clicks to an Assignment item
    $('#assignments-page ul').on('click', 'li a', function(ev){
        var $node = $(this);
        var id = $node.attr('node-id');
        var name = $node.text();
        
        // Populate the stats list
        gma.getReportsForNode(id)
        .fail(errorHandler)
        .then(function(results){
        
            reports = new ReportSet(results);
            showReport( reports.get() );
        
        });
    });
    
    

    /////////////////////////////
    //    STATS ENTRY PAGE     //
    /////////////////////////////
    
    /**
     * Populates the stats entry page with a given report
     * @param report Report
     */
    var showReport = function (report) {
        if (!report) {
            return;
        }
    
        var $list = $('#stats-page ul.measurements');
        
        $('#stats-page #report-name').html(report.nodeName);
        $('#stats-page #report-date').html(report.period());
        $list.empty();
        
        report.measurements()
        .fail(errorHandler)
        .then(function(measurements){
            for (var strategy in measurements) {
                // Add a list divider for each strategy
                $list.append('<li data-role="list-divider">' + strategy + '</li>');
                for (var i=0; i<measurements[strategy].length; i++) {
                    var m = measurements[strategy][i];
                    var label = m.label();
                    var id = m.id();
                    var value = m.value();
                    // Create a <LI> element to hold the measurement row
                    var $row = $(
                        '<li class="ui-field-contain ui-btn ui-btn-icon-right ui-icon-plus">'
                            + '<label>' + label + '</label>'
                            + '<input pattern="[0-9]" type="tel" value="' + value + '">'
                        + '</li>'
                    );
                    // Attach the Measurement object to the row
                    $row.data('Measurement', m);
                    // Insert the row into the DOM
                    $list.append($row);
                }
            }
            $list.listview('refresh');
            // Show the stats page
            Page.list['stats-page'].push();
        });
        
    };
    
    // Clicking on the Back button will dismiss the stats page
    $('#stats-page #report-back').on('click', function(){
        Page.pop();
    });
    
    // Clicking on the row will auto increment the measurement value
    $('#stats-page ul').on('click', 'li', function(){
        var $li = $(this);
        var $input = $li.find('input');
        var value = parseInt($input.val());
        if (value >= 1) {
            value += 1;
        } else {
            value = 1;
        }
        $input.val(value);
        $input.trigger('change');
    });
    
    // Prevent the auto increment if the user was tapping on the textbox to
    // manually enter a value
    $('#stats-page ul').on('click', 'li input', function(ev){
        ev.stopPropagation();
    });
    
    
    // Update the server on every value change
    $('#stats-page ul').on('change', 'li input', function(ev){
        var $row = $(this).parent();
        var val = $(this).val();
        var measurement = $row.data('Measurement');
        measurement.value( val );
        measurement.delayedSave().fail(errorHandler);
    });
    
    
    // Switch to a different report preiod when the arrow button is clicked
    $('#stats-page a.report-nav').on('click', function(){
        var $this = $(this);
        if ($this.hasClass('report-previous')) {
            showReport( reports.prev() );
        } else {
            showReport( reports.next() );
        }
    });
    
    
    
};
