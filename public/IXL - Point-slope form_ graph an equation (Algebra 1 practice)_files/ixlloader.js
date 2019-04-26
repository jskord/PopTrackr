(function() {

  var lang = YAHOO.lang,
      util = YAHOO.util,
      YUILoader = util.YUILoader;

  var IXL = {

    useIXLBase: {},

    info: {
      root: '2.9.0/build/',
      base: '/yui2.9.0/',

      ixlBase:  null, // gets overridden in makeDefaultLoader

      comboBase: 'http://yui.yahooapis.com/combo?',

      skin: {
          'defaultSkin': 'sam',
          'base': 'assets/skins/',
          'path': 'skin.css',
          'after': ['reset', 'fonts', 'grids', 'base'],
          'rollup': 3
      },

      moduleInfo: {

        /*********************************************************************
         *                        Common modules                             *
         *********************************************************************/

        "ixlutils": {
          type: "js",
          path: "common/utils.js",
          requires: ["cookie","dom","event","yahoo"],
          varName: "YAHOO.ixl.topic"
        },

        "flowdialog": {
          type: "js",
          path: "common/flowdialog.js",
          requires: ["animation", "connection", "container", "dragdrop", "ixlutils"]
        },

        "login": {
          type: "js",
          path: "account/login.js",
          requires: ["cookie", "flowdialog", "get", "ixlutils"],
          varName: "redirectByUserType"
        },

        "marketing": {
          type: "js",
          path: "marketing/marketing.js",
          requires: ["flowdialog", "menu"],
          varName: "YAHOO.widget.FlowDialog"
        },

        "profile": {
          type: "js",
          path: "account/profile.js",
          requires: ["carousel", "cookie", "flowdialog", "ixlutils"],
          varName: "profileDialog"
        },

        "accordion": {
          type: "js",
          path: "navigation/accordion.js",
          requires: ["cookie", "flowdialog", "ixlutils"]
        },

        "screenshots": {
          type: "js",
          path: "navigation/skillscreenshots.js",
          requires: ["container", "flowdialog"],
          varName: "YAHOO.ixl.widget.ScreenshotTooltip"
        },

        "swfobject": {
          type: "js",
          fullpath: "/script/swfobject.js",
          varName: "swfobject"
        },

        "buzz": {
          type: "js",
          fullpath: "/vendor/buzzjs/js/buzz-min.js",
          varName: "buzz"
        },

        /*********************************************************************
         *                        Specific modules                           *
         *********************************************************************/

        "account": {
          type: "js",
          path: "account/account.js",
          requires: ["connection", "dom", "event", "flowdialog", "json", "ccutils",
                     "event-delegate", "selector"],
          varName: "printReceipt"
        },

        "awardsgame": {
          type: "js",
          path: "awards/game.js",
          requires: ["datasource", "datatable", "flowdialog", "ixlutils", "json"],
          varName: "YAHOO.widget.GameBoard"
        },

        "noaccess": {
          type: "js",
          path: "common/noAccess.js",
          requires: ["flowdialog", "ixlutils"],
          varName: "YAHOO.widget.FlowDialog"
        },

        "retryxhrdatasource": {
          type: "js",
          path: "common/retryXHRDataSource.js",
          requires: ["datasource"],
          varName: "YAHOO.ixl.RetryXHRDataSource"
        },

        "diagnose": {
          type: "js",
          path: "practice/diagnose.js",
          requires: ["json"],
          varName: "YAHOO.ixl.DiagnosePracticeEngine"
        },

        "practicehelper": {
          type: "js",
          path: "practice/practiceHelper.js",
          requires: ["ixlutils", "flowdialog"]
        },

        "generatorswf": {
          type: "js",
          path: "practice/generatorSWF.js",
          requires: ["swf"],
          varName: "YAHOO.ixl.GeneratorSWF"
        },

        "playevents": {
          type: "js",
          path: "practice/playevents.js",
          requires: ["connection", "cookie", "dom", "event", "flowdialog",
                     "ixlutils", "json"],
          optional: ["event-delegate"],
          varName: "YAHOO.ixl.correctAccolades"
        },

        "flashquestionutils": {
          type: "js",
          path: "practice/flashquestionutils.js",
          requires: ["dom", "swfobject"],
          varName: "saveScreenshot"
        },

        "practice": {
          type: "js",
          path: "practice/playevents.js",
          requires: ["connection", "cookie", "dom", "event", "flashquestionutils", "flowdialog",
                     "ixlutils", "json", "swfobject"],
          optional: ["event-delegate"],
          varName: "YAHOO.ixl.correctAccolades"
        },

        "practiceaudio": {
          type: "js",
          path: "practice/practiceaudio.js",
          requires: ["button", "flowdialog", "swf", "buzz"],
          varName: "YAHOO.ixl.AudioManager"
        },

        "qgtest": {
          type: "js",
          path: "practice/qgtest.js",
          requires: ["autocomplete", "container", "datasource", "dom", "event"],
          varName: "writetxt"
        },

        "multiplestandards": {
          type: "js",
          path: "standards/multiplestandards.js",
          requires: ["connection", "cookie", "dom", "event"],
          varName: "YAHOO.ixl.multiStds"
        },

        "standards": {
          type: "js",
          path: "standards/standards.js",
          requires: ["container", "event"],
          varName: "YAHOO.widget.FlowDialog"
        },

        "help": {
          type: "js",
          path: "help/help.js",
          requires: ["dom", "event", "element"]
        },

        "envDetection": {
          type: "js",
          path: "../ixl/util/env_detection.js",
          requires: ["dom", "cookie", "event"]
        },

        "international": {
          type: "js",
          path: "navigation/international/international.js",
          requires: ["dom", "event", "flowdialog"],
          varName: "YAHOO.ixl.international"
        },

        "roster": {
          type: "js",
          path: "roster/roster.js",
          requires: ["connection", "dom", "event", "event-delegate", "selector", "flowdialog"],
          varName: "YAHOO.widget.FlowDialog"
        },

        "masterlist": {
          type: "js",
          path: "roster/ixlmasterlist.js",
          requires: ["autocomplete"],
          varName: "YAHOO.widget.RosterAutoComplete"
        },

        "admin": {
          type: "js",
          path: "admin/admin.js",
          requires: ["autocomplete", "button", "cookie", "dom",
                     "datasource", "datatable",
                     "menu", "paginator", "admincss", "ixlutils"],
          varName: "YAHOO.widget.AdminDataTable"
        },

        "admincss": {
          type: "css",
          path: "admin/css/admin.css"
        },

        "limitdatescalendar": {
          type: "js",
          path: "admin/limitdatescalendar.js",
          requires: ["calendar"],
          varName: "YAHOO.widget.LimitDatesCalendar"
        },

        "managestudents": {
          type: "js",
          path: "admin/managestudents.js",
          requires: ["admin", "button", "cookie", "datasource", "datatable"]
        },

        "manageteachers": {
          type: "js",
          path: "admin/manageteachers.js",
          requires: ["admin", "datasource", "datatable"]
        },

        "manageadmins": {
          type: "js",
          path: "admin/manageadministrators.js",
          requires: ["admin", "datasource", "datatable"]
        },

        "manageaccount" : {
          type: "js",
          path: "admin/manageaccount.js",
          requires: ["admin", "datasource", "datatable", "slider", "flowdialog", "limitdatescalendar"]
        },

        "buildingblocks" : {
          type: "js",
          path: "admin/buildingblocks.js",
          requires: ["admin", "dragdrop", "flowdialog"]
        },

        "managelicense" : {
          type: "js",
          path: "admin/managelicense.js",
          requires: ["flowdialog", "ixlutils"]
        },

        // Subscription JS

        "ccutils": {
          type: "js",
          path: "subscription/ccutils.js",
          requires: ["container", "dom", "event", "event-delegate", "selector"],
          varName: "YAHOO.ixl.CCUtils"
        },

        "activation": {
          type: "js",
          path: "subscription/activation.js",
          requires: ["connection", "dom", "event", "ixlutils", "json"],
          varName: "YAHOO.util.Connect"
        },

        "classroom": {
          type: "js",
          path: "subscription/classroom.js",
          requires: [
            "connection", "dom", "event", "event-delegate", "selector", "event-mouseenter"],
          varName: "YAHOO.util.Event"
        },

        "steptwo": {
          type: "js",
          path: "subscription/steptwo.js",
          requires: ["container", "dom", "event", "json", "ccutils", "selector"],
          varName: "YAHOO.util.Event"
        },

        "familysetup": {
          type: "js",
          path: "subscription/familysetup.js",
          requires: ["container"],
          varName: "YAHOO.ixl.familysetup"
        },

        "removechildren": {
          type: "js",
          path: "subscription/removechildren.js",
          requires: ["flowdialog", "ixlutils"],
          varName: "YAHOO.widget.FlowDialog"
        },

        "usernames": {
          type: "js",
          path: "subscription/usernames.js",
          require: ["dom", "event"],
          varName: "YAHOO.util.Event"
        },

        // Reports

        "advreports": {
          type: "js",
          path: "reports/advreports.js",
          requires: ["accordion", "cookie"],
          varName: "YAHOO.widget.AdvancedReport"
        },

        "advreportlanding": {
          type: "js",
          path: "reports/advreportlanding.js",
          requires: ["accordion", "datasource", "dom", "event"],
          varName: "setImage"
        },

        "a8": {
          type: "js",
          path: "reports/usage/a8.js",
          requires: ["datatable", "paginator", "practiceaudio", "a8solution"],
          varName: "YAHOO.ixl.ProblemDetailsDataTable"
        },

        "a8solution": {
          type: "js",
          path: "reports/usage/a8solution.js",
          varName: "YAHOO.ixl.A8Solution"
        },

        "adminreports": {
          type: "js",
          path: "reports/adminreports.js",
          requires: ["admin", "dom", "event", "flowdialog", "datatable", "limitdatescalendar", "stylesheet"],
          varName: "adminreports"
        }
      }
    }
  };

  // Populate the useIXLBase field
  for (var name in IXL.info.moduleInfo) {
    IXL.useIXLBase[IXL.info.moduleInfo[name].path] = true;
  }

  var IXLLoader = function(o) {
    IXLLoader.superclass.constructor.call(this, o);

    this.base = IXL.info.base;
    this.ixlBase = IXL.info.ixlBase;
    this.comboBase = IXL.info.comboBase;
    this.root = IXL.info.root;
    this.moduleInfo = lang.merge(this.moduleInfo, IXL.info.moduleInfo);
    this.skin = lang.merge(this.skin, IXL.info.skin);

    // Turn off the container skin
    this.moduleInfo['container'].skinnable = false;

    // Increase the number of items required before using skin rollup
    this.skin.rollup = 10;
  };

  YAHOO.extend(IXLLoader, YUILoader, {
    _url: function(path) {
      var base = this.base || "";
      if (IXL.useIXLBase[path]) base = this.ixlBase;
      return this._filter(base + path);
    }
  });

  IXLLoader.makeDefaultLoader = function(isSignedIn, isAdmin, loadSubLogin, staticPath, yui3instance) {
    IXL.info.ixlBase = (staticPath || '/static') + '/math/';

    var loader = new IXLLoader({
      require: ["login", "marketing"],
      onSuccess: function() {
        this.defaultSuccess();
      }
    });

    if (isSignedIn) {
      loader.require("profile");
    }
    if (isAdmin) {
      loader.require(["admincss", "limitdatescalendar"]);
    }

    loader.defaultSuccess = function() {
      util.Event.onDOMReady(function() {
        var IXLTopic = YAHOO.ixl.topic;

        if (loadSubLogin) {
          IXLTopic.fireEvent('loadSubLogin');
        }
        else if (!isAdmin) {
          IXLTopic.fireEvent('loadWelcomeTrial');
        }

        if (isAdmin) {
          IXLTopic.fireEvent("loadSelectSchoolStart");
        }

        if (yui3instance && yui3instance.Global) {
          yui3instance.Global.fire('yui2:ready', YAHOO);
        }
      });
    };

    return loader;
  };

  util.IXLLoader = IXLLoader;

})();
