/************************************************************************/
/**
 * @class GMA (offline demo)
 * Joshua Chan <joshua@appdevdesigns.net>
 *
 * This is for demontrating the user interface only.
 *
 *  Dependencies:
 *    - jQuery
 *        
 */

var GMA = function (opts) {
    var defaults = {
        gmaBase: 'http://gma.example.com/',
        casURL: 'https://signin.example.com/cas',
        showBusyAnim: function() {},
        hideBusyAnim: function() {},
        reloginCallback: null
    };
    this.opts = $.extend(defaults, opts);

    this.isLoggedIn = false;
    this.renId = null;
    this.GUID = null;
    this.isLoading = 0;
}


/**
 * @function login
 *
 * Uses the CAS RESTful interface to log in to the GMA site.
 * Further requests to GMA will be authenticated because of the browser
 * cookie used by jQuery.ajax().
 *
 * @param string username
 * @param string password
 * @return jQuery Deferred
 */
GMA.prototype.login = function (username, password) {
    var dfd = $.Deferred();
    var self = this;
    
    self.opts.showBusyAnim();
    setTimeout(function(){
        self.opts.hideBusyAnim();
        dfd.resolve();
    }, 2000);
    
    return dfd;
}


/**
 * @function getUser
 *
 * @return jQuery Deferred
 *      resolves with parameter `ren` {
 *          renId: int,
 *          renPreferredName: string,
 *          GUID: string
 *      }
 */
GMA.prototype.getUser = function () {
    var dfd = $.Deferred();
    
    this.preferredName = "Demo User";
    this.renId = '123';
    this.GUID = 'DEMO_USER';
    
    dfd.resolve({
        renId: this.renId,
        renPreferredName: this.preferredName,
        GUID: this.GUID
    });
    
    return dfd;
}


/** 
 * @function getAssignments
 *
 * Delivers the GMA nodes that the user is assigned to.
 * 
 * @return jQuery Deferred
 *      resolves with two parameters
 *      - assignmentsByID { 101: "Assign1", 120: "Assign2", ... }
 *      - assignmentsByName { "Assign1": 101, "Assign2": 120, ... }
 */
GMA.prototype.getAssignments = function () {
    var dfd = $.Deferred();
    
    dfd.resolve(
        { 101: "Assignment1", 120: "Assignment2" },
        { "Assignment1": 101, "Assignment2": 120 }
    );
    
    return dfd;
}



/** 
 * @function getReportsForNode
 *
 * Delivers an array of up to ten Report objects for reports within 
 * the specified node.
 *
 * @param int nodeId
 * @return jQuery Deferred
 */
GMA.prototype.getReportsForNode = function (nodeId) {
    var dfd = $.Deferred();
    var self = this;
    
    var reports = [];
    var dummyData = [
        { reportId: 1, nodeId: 101, nodeName: "Assignment1", startDate: '20140101', endDate: '20140201' },
        { reportId: 2, nodeId: 101, nodeName: "Assignment1", startDate: '20140202', endDate: '20140301' },
        { reportId: 3, nodeId: 101, nodeName: "Assignment1", startDate: '20140302', endDate: '20140401' },
    ];
    
    for (var i=0; i<dummyData.length; i++) {
        reports.push(new Report({
            gma: self,
            reportId: dummyData[i].reportId,
            nodeId: dummyData[i].nodeId,
            nodeName: dummyData[i].nodeName,
            startDate: dummyData[i].startDate,
            endDate: dummyData[i].endDate
        }));
    }
    
    dfd.resolve(reports);
    return dfd;
}



/** 
 * @function logout
 *
 * Logs out of the Drupal website that GMA is on.
 *
 * @return jQuery Deferred
 */
GMA.prototype.logout = function () {
    var dfd = $.Deferred();
    dfd.resolve();
    return dfd;
}



/************************************************************************/
/**
 * @class Report
 */
 
var Report = function(data) {
    
    this.gma = data.gma;

    this.reportId = data.reportId;
    this.nodeId = data.nodeId;
    this.nodeName = data.nodeName;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    
}


/**
 * @function measurements
 *
 * Delivers a bunch of Measurement objects in this format:
 * {
 *     "Strategy Name 1": [
 *          Measurement1.1,
 *          Measurement1.2,
 *          ...
 *      ],
 *      "Strategy Name 2": [
 *          Measurement2.1,
 *          Measurement2.2,
 *          ...
 *      ],
 *      ...
 * }
 *
 * @return jQuery Deferred
 */
Report.prototype.measurements = function () {
    var dfd = $.Deferred();
    var self = this;
    
    var measurements = { A: [], B: [], C: [] };
    var dummyData = [
        { id: 1, name: "Apples", description: "red", value: "10" },
        { id: 2, name: "Grapes", description: "Purple", value: "15" },
        { id: 3, name: "Bananas", description: "Yellow", value: "9" },
        { id: 4, name: "Oranges", description: "Orange", value: "12" }
    ];
    
    for (var strategy in measurements) {
        for (var i=0; i<dummyData.length; i++) {
            measurements[strategy].push(
                new Measurement({
                    gma: self.gma,
                    reportId: self.reportId,
                    measurementId: dummyData[i].id,
                    measurementName: dummyData[i].name,
                    measurementValue: dummyData[i].value
                })
            );
        }
    }
    
    dfd.resolve(measurements);
    return dfd;
}

Report.formatDate = function (ymd) {
    return ymd.substr(0, 4) + '-'
         + ymd.substr(4, 2) + '-'
         + ymd.substr(6, 2);
}


Report.prototype.period = function () {
    return Report.formatDate(this.startDate)
            + ' &ndash; '
            + Report.formatDate(this.endDate);
}



/************************************************************************/
/**
 * @class Measurement
 *
 * A measurement is unique to a particular report.
 */

var Measurement = function (data) {
    this.gma = data.gma;
    delete data.gma;
    
    var defaults = {
        reportId: 0,
        measurementId: 0,
        measurementName: "Measurement",
        measurementDescription: "This is a GMA measurement",
        measurementValue: 0
    };
    this.data = $.extend(defaults, data);

    this.timer = null;
    this.pendingDFD = null;
}

Measurement.timeout = 3000; // 3 seconds for delayed save operation

Measurement.prototype.label = function () {
    return this.data.measurementName;
}

Measurement.prototype.id = function () {
    return this.data.measurementId;
}

Measurement.prototype.value = function (val) {
    if (typeof val != 'undefined') {
        return this.data.measurementValue = val;
    } 
    return this.data.measurementValue;
}

/**
 * Wait a few seconds before saving the measurement value to the server.
 * Any new delayed save operations within that time will replace this one.
 */
Measurement.prototype.delayedSave = function () {
    var self = this;
    var dfd = $.Deferred();
    
    // Cancel any previous delayed save requests
    if (self.timer) {
        clearTimeout(self.timer);
        self.timer = null;
        // Cancelling is an expected behaviour and not an error
        self.pendingDFD.resolve("Cancelled");
    }
    
    self.pendingDFD = dfd;
    self.timer = setTimeout(function(){
        // The actual save is done here once the time comes
        self.save()
        .then(function(){
            dfd.resolve();
        })
        .fail(function(err){
            dfd.reject(err);
        });
    }, Measurement.timeout);
    
    return dfd;
}

/**
 * Save the measurement's value to the server immediately.
 */
Measurement.prototype.save = function () {
    var dfd = $.Deferred();
    dfd.resolve();
    return dfd;
}

