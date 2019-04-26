olderBrowserTest();

(function() {

  var Y = PROD_YUI,
      util = YAHOO.util,
      IXL = YAHOO.ixl,
      Cookie = util.Cookie,
      Dom = util.Dom,
      IXLTopic = IXL.topic,
      NotificationPanel = IXL.NotificationPanel,
      FlowDialog = YAHOO.widget.FlowDialog,
      ixlLocalizedText = Y.IXL.Intl.getModule("util-StaticResources"),
      IncompleteAnswerPopoverContainer = Y.IXL.IncompleteAnswerPopoverContainer,
      IncompleteAnswerPopoverEvent = Y.IXL.IncompleteAnswerPopoverEvent;

  var showChallengePanel = (function () {
    var cPanel = null;

    return function (bdText) {
      if (cPanel) {
        cPanel.setBody(bdText);
      }
      else {
        cPanel = NotificationPanel.create(bdText, {width: "auto"});
        cPanel.destroyEvent.subscribe(function () {
          cPanel = null;
        });
      }
      return cPanel;
    };

  }());

  var diagnoseFailure = (function() {
    var PRACTICE_ENGINE_FAILURE_COUNT_COOKIE = 'PEFCount',
        MAX_NUM_PRACTICE_ENGINE_FAILURES = 5;

    var updateFailureCount = function() {
      var numFailures = Cookie.get(PRACTICE_ENGINE_FAILURE_COUNT_COOKIE);
      if (!numFailures) {
        numFailures = 1;
      }
      else {
        numFailures = parseInt(numFailures, 10) + 1;
      }
      Cookie.set(PRACTICE_ENGINE_FAILURE_COUNT_COOKIE, numFailures, {
        path: window.location.pathname
      });

      return numFailures;
    };

    return function(diagnosePracticeUrl, xhr) {
      var status = xhr.status;
      try {
        var numFailures = updateFailureCount();

        if (numFailures > MAX_NUM_PRACTICE_ENGINE_FAILURES) {
          window.location = diagnosePracticeUrl;
        }
        else if (status === 400 || status === -1 || status === 0 || status === 403) {
          window.location.reload(true);
        }
        else if (status >= 500 && status < 600) {
          FlowDialog.ajaxFailure(xhr);
        }
        else {
          window.location = diagnosePracticeUrl;
        }
      }
      catch(e) {
        window.location = diagnosePracticeUrl;
      }
    };
  }());

  var bindToPracticeAgent = function(cfg) {

    var practiceAgent = cfg.practiceAgent,
        Y = cfg.Y,
        diagnosticUrl = cfg.diagnosticUrl,
        prizes = cfg.prizes;

    var model = practiceAgent.get('model');

    var confirm = (function() {
      var container = new IncompleteAnswerPopoverContainer(
        {practiceAudioPaths: cfg.incompleteAnswerPopoverAudioPaths});
      container.render();

      return function (cfg) {
        var incompleteAnswerPopover = container.getPopover();
        incompleteAnswerPopover.updateMessage(cfg.answeraction, cfg.context);
        Y.on(IncompleteAnswerPopoverEvent.SUBMIT, cfg.confirmed);
        Y.on(IncompleteAnswerPopoverEvent.CANCEL, cfg.denied);

        incompleteAnswerPopover.openPopover();
      };
    }());

    var showPrizesMessage = function(isNew) {
      var sShowPrizesMsgBannerClsName = 'box-show-prizes-msg';
      var bdText;
      var linkText = "<a class=\"lk-go-claim-prizes\" href='" + prizes.prizeUrl + "'> " +
          ixlLocalizedText.getText("practicehelper.prize_message.linktext",
              {
                  prizeLocation:  prizes.prizeLocation
              })  + "</a>";
      if (isNew) {
        bdText = ixlLocalizedText.getRaw("practicehelper.prize_message.new",
            {
                prizeTypeSingular: prizes.prizeTypeSingular,
                link: linkText
            })
      }
      else {
        bdText = ixlLocalizedText.getRaw("practicehelper.prize_message.reveal",
            {
                prizeTypePlural: prizes.prizeTypePlural,
                link: linkText
            })
      }
      var panel = showChallengePanel(bdText);

      Dom.addClass(panel.element, sShowPrizesMsgBannerClsName);

      panel.destroyEvent.subscribe(function () {
        panel = null;
      });

      // we want to be able to hide the message when showing the summary page
      practiceAgent.after('hidePrizesMessage', function() {
        if (panel !== null) {
          panel.destroy();
        }
      });
    };

    // The prize message obscures the button to view an example question, so we do
    // not show the prize message if the example question is available.
    if (prizes.reveal && !model.isSampleAvailableCurrently()) {
      showPrizesMessage(false);
    }

    // If the example question is no longer available on the practice page,
    // the prize message can be shown if appropriate.
    practiceAgent.after('showNextStep', function() {
      if (model.isSampleAvailableCurrently()) {
        return;
      }

      if (practiceAgent.practiceStats.get('prizesToReveal')) {
        showPrizesMessage(true);
      }
      else if (prizes.reveal) {
        showPrizesMessage(false);
      }
    });

    practiceAgent.on('question:confirm', confirm);

    practiceAgent.after('showCutoffPopover', function(e, cutoffType, popover) {
      if (cutoffType === 'NO_ACCESS') {
        IXLTopic.fireEvent('showNoAccess', popover);
      }
      else {
        IXLTopic.fireEvent('showPracticeLimit', popover);
      }
    });

    // show the login prompt according to the logic in PracticeAgent
    if (practiceAgent.get('showLogin')) {
      IXLTopic.fireEvent("showPracticeLoginDialog");
    }

    // Listen for io failures and handle them appropriately.
    practiceAgent.get('model').after('practiceIOFailure', function(e) {
      var xhr = e.xhr;
      var text = xhr.responseText;

      // If we can parse the JSON text, we want a flow dialog
      try {
        var json = Y.JSON.parse(text);
        //var dialog = new FlowDialog("invalidSmartScore", {
        //  response_type: 'json'
        //});
        //dialog.handleResponse(text);
        PROD_YUI.IXL.smartScoreOutOfDate.openDialog(json);
      }
      catch(e) {
        // If the JSON fails to parse, attempt to diagnose the issue.
        diagnoseFailure(diagnosticUrl, xhr);
      }
    });

    var flashDialog = null;
    practiceAgent.after('noAudio', function() {
      if (flashDialog === null) {
        flashDialog = new YAHOO.widget.FlowDialog(Dom.generateId(), {
          buttons: [{text: ixlLocalizedText.getText("practicehelper.flash_dialog.button.continue"),
              handler: "submit", img: "forward"}, FlowDialog.CANCEL_BUTTON ],
          visible: false,
          postmethod: "manual",
          width: "400px"
        });
        flashDialog.setHeader(ixlLocalizedText.getText("practicehelper.flash_dialog.header"));
        flashDialog.setBody(ixlLocalizedText.getRaw("practicehelper.flash_dialog.body"));

        // Handle the submission of the confirmation dialog
        flashDialog.manualSubmitEvent.subscribe(function() {
          window.location.reload();
        }, this, true);

        flashDialog.render(document.body);
      }

      flashDialog.show();
    });

    IXLTopic.subscribe("hideLogin", function () {
      Y.Global.fire('question:focus');
    });
  };

  YAHOO.ixl.PracticeHelper = {
    bindToPracticeAgent: bindToPracticeAgent
  };

}());

