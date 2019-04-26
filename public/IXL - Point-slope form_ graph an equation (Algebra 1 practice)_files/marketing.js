var marketingDialog;
var ixlLocalizedText = PROD_YUI.IXL.Intl.getModule("util-StaticResources");

(function() {

  var util = YAHOO.util,
      widget = YAHOO.widget,
      Dom = util.Dom,
      Event = util.Event,
      YConnect = util.Connect,
      FlowDialog = widget.FlowDialog,
      IXLTopic = YAHOO.ixl.topic;

  var conditionalCreate = function(el, func, args) {
    el = Dom.get(el);
    if (el) {
      return func.apply(el, args);
    }
    return false;
  };

  var createSmartScoreTooltip = function(smartScoreInfo) {
    var tt = new YAHOO.widget.InteractiveTooltip("smartscoreTT", {
      // context: "smartscore",
      context: "smartscore-subheader-overlay",
      requestURI: "/practice/smartscoreToolTip",
      preventoverlap: false,
      autodismissdelay: -1,
      hidedelay: 500,
      xyoffset: [0, 20]
    });

    // Hide the tooltip as soon as the smartScoreInfo is shown.
    smartScoreInfo.subscribe("show", tt.hide, null, tt);

    // Reset the smartScoreInfo links event listener so that the event is
    // attached properly. This fixes an issue in IE6.
    tt.subscribe("show", function() {
      smartScoreInfo.cfg.resetProperty("links");
    });

    // A corollary to the above function, remove the smartScoreInfo links
    // event listener so that the events can be reattached later.
    tt.subscribe("beforeHide", function() {
      smartScoreInfo.cfg.setProperty("links", null);
    });

    return tt;
  };

  var createSigninTroubleDialog = function() {
    var signinTrouble = new FlowDialog(Dom.generateId(), {
      buttons: [ FlowDialog.CLOSE_BUTTON ],
      links: ["signinTrouble"],
      response_type: "json",
      width: "430px"
    });

    signinTrouble.beforeOpenDialogFromLink = function(href) {
      return href + "/help";
    };

    return signinTrouble;
  };

  var addEmail = function() {

    var ajaxBefore = "ajaxBefore",
        ajaxAfter = "ajaxAfter",
        ajaxEvents = new util.EventProvider();

    ajaxEvents.createEvent(ajaxBefore);
    ajaxEvents.createEvent(ajaxAfter);

    var textPlaceholder = function(el) {
      if (el.placeholder && 'placeholder' in document.createElement(el.tagName)) return;

      var placeholder = el.getAttribute('placeholder'),
          cssClass = 'text-placeholder';

      if (el.value === '' || el.value == placeholder) {
        Dom.addClass(el, cssClass);
        el.value = placeholder;
      }

      Event.addListener(el, 'focus', function() {
        if (Dom.hasClass(el, cssClass)) {
          el.value = '';
          Dom.removeClass(el, cssClass)
        }
      });

      Event.addListener(el, 'blur', function() {
        if (el.value === '') {
          Dom.addClass(el, cssClass);
          el.value = placeholder;
        }
        else {
          Dom.removeClass(el, cssClass);
        }
      });

      if (el.form) {
        ajaxEvents.subscribe(ajaxBefore, function() {
          if (Dom.hasClass(el, cssClass)) {
            el.value = '';
          }
        });
        ajaxEvents.subscribe(ajaxAfter, function() {
          if (Dom.hasClass(el, cssClass) && el.value === '') {
            el.value = placeholder;
          }
        });
      }
    };

    var nameIsEmail = function(el) {
      return el.name && el.name.toUpperCase() === 'EMAIL';
    };

    Dom.getElementsBy(nameIsEmail, 'input', this, textPlaceholder);

    Event.addListener(this, 'submit', function(e) {
      Event.preventDefault(e);

      var form = Event.getTarget(e);

      ajaxEvents.fireEvent(ajaxBefore);

      YConnect.setForm(form);
      YConnect.asyncRequest(form.method, form.action, {
        success: function(o) {

          var nEmailAjaxMsg = Dom.get("emailAjaxMsg"),
              nlErr;
          nEmailAjaxMsg.innerHTML = o.responseText;

          // check to see if error messages are placed in correct order
          nlErr = Dom.getElementsBy(function(el){
            return true;
          }, 'li', nEmailAjaxMsg, function(el) {
            // el is LI DOM element
            Dom.addClass(el, 'err-msg');
            Dom.getElementsBy(function(n){
              return true;
            }, 'span', el, function(n) {

              var sErr = n.innerHTML,
                  nPreviousSib = Dom.getPreviousSibling(el),
                  nNextSib = Dom.getNextSibling(el),
                  sTopicSubjectCssCls = 'topic-subject',
                  sEmailCssCls = 'e-mail';

              // check the text inside the span, apply appropriate css classname to the <li />
              // if only one error message and for topic, then insert an empty <li /> in the front
              if (sErr.indexOf('subject') > -1 || sErr.indexOf('topic') > -1) {
                Dom.addClass(el, sTopicSubjectCssCls );
                if (!nPreviousSib && !nNextSib) {
                  Dom.insertBefore(document.createElement('li'), el);
                }
              }

              // check the text inside the span, apply appropriate css classname to the <li />
              // if previous node is for topic, then swap them to in correct order
              if (sErr.indexOf('e-mail') > -1 || sErr.indexOf('email') > -1) {
                Dom.addClass(el, sEmailCssCls);
                if (nPreviousSib && Dom.hasClass(nPreviousSib, sTopicSubjectCssCls)) {
                  Dom.insertAfter(nPreviousSib, el);
                }
              }

            });
          });
        },
        failure: FlowDialog.ajaxFailure
      });

      ajaxEvents.fireEvent(ajaxAfter);
    });

  };

  // Create the country specific domain drop list button
  var setupCSDSelect = function() {

    var clickFn = function(p_sType, p_aArgs, p_oValue) {
      util.Cookie.set("PPEO", p_oValue, {
        path: "/"
      });
    };

    var buildCountry = function(fullName, editionConstant, twoLetter, editionUrl) {
      return  {
        classname: 'csd-menu-flag csd-flag-' + twoLetter,
        text: fullName,
        url: editionUrl,
        onclick: {
          fn: clickFn,
          obj: editionConstant
        }
      };
    };

    var countryList = [];
    var nCSD = Dom.get("csd");
    var sCssClsShowCSD = 'csd-show-menu';
    var nBoxCsdFlag = Dom.getAncestorByClassName(nCSD, 'box-csd-flag');

    for (i = 0; i < editionsJson.length; i++) {
      countryList.push(buildCountry(editionsJson[i].fullName, editionsJson[i].editionConstant, editionsJson[i].twoLetter, editionsJson[i].editionUrl));
    }
    var oMenuContainer = document.body.appendChild(document.createElement('div'));
    Dom.setAttribute(oMenuContainer, "id", "csd-container");
    Dom.addClass(oMenuContainer, "yui-skin-sam");

    var csdMenu = new widget.Menu("csd-menu", {
      container: oMenuContainer,
      context: [nCSD, "tr", "br", ["windowResize"]],
      itemdata: countryList,
      lazyLoad: true,
      width: "137px",
      zindex: 20
    });

    // PRODUCT-20379 - Enable edition picker on page 1 of family subscription flow
    // Due to the 'single-app' nature of family sub flow, the listener must apply regardless of
    // initial render.
    var conditionalOpeningCsdMenu = function(evt) {
      evt.preventDefault();
      if (!Dom.hasClass(nBoxCsdFlag, 'box-csd-flag-hide-arrow')) {
        csdMenu.show();
      }
    };

    var csdLink = document.querySelector('#csd');

    // Prevent link from linking to international page.
    csdLink.href = "javascript:void(0)";

    !!csdLink && csdLink.addEventListener('click', conditionalOpeningCsdMenu);

    csdMenu.showEvent.subscribe(function() {
      Dom.addClass(nCSD, sCssClsShowCSD);
      !!csdLink && csdLink.removeEventListener('click', conditionalOpeningCsdMenu);
      csdMenu.cfg.resetProperty("context");
    });

    csdMenu.hideEvent.subscribe(function() {
      Dom.removeClass(nCSD, sCssClsShowCSD);
      YAHOO.lang.later(250, null, function() {
        !!csdLink && csdLink.addEventListener('click', conditionalOpeningCsdMenu);
      });
    });
  };

  // Handle closing banner messgae and setting up cooklies
  // If no cookieInfo included, then just close the banner
  // 1. Closing the downtime message
  // 2. closing the privacy policy banner for using cookie message #PRODUCT-2330
  var setupCookieHandler = function(param) {
    var hideMessage = function (ev) {
      Event.stopEvent(ev);
      Event.removeListener(param.buttonId, "click", hideMessage);
      var el = Dom.get(param.parentId);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
      if (param.cookieInfo !== undefined) {
        var cookieName = param.cookieInfo.name;
        var cookieValue = param.cookieInfo.value;
        var cookieSetting = {};
        if(param.cookieInfo.expires !== undefined) {
          cookieSetting.expires = param.cookieInfo.expires;
        }
        if(param.cookieInfo.path !== undefined) {
          cookieSetting.path = param.cookieInfo.path;
        }
        util.Cookie.set(cookieName, cookieValue, cookieSetting);
      }
    };

    Event.addListener(param.buttonId, "click", hideMessage);
  };

  var renderAtHomeTooltips = function () {
    var ttShowListener = function() {
      this.cfg.setProperty("zindex", 1000);
    };

    var ttHideListener = function() {
      this.cfg.setProperty("zindex", 1);
    };
    var additionalEmailTT = new YAHOO.widget.Tooltip("whatIsAdditionalEmailAddressesTT", {
      context: "whatIsAdditionalEmailAddresses",
      text: "<p>" + ixlLocalizedText.getText("marketing.tooltip.email_dialog.additional_emails") + "</p>",
      autodismissdelay: 60000,
      width: "250px",
      xyoffset: [0, 11]
    });
    additionalEmailTT.showEvent.subscribe(ttShowListener);
    additionalEmailTT.hideEvent.subscribe(ttHideListener);

    var rosterEmailTT = new YAHOO.widget.Tooltip("whatIsRosterEmailAddressesTT", {
      context: "whatIsRosterEmailAddresses",
      text: "<p>" + ixlLocalizedText.getText("marketing.tooltip.email_dialog.includes_username") + "</p>",
      autodismissdelay: 60000,
      width: "250px",
      xyoffset: [0, 11]
    });
    rosterEmailTT.showEvent.subscribe(ttShowListener);
    rosterEmailTT.hideEvent.subscribe(ttHideListener);

    if (Dom.get("whatIsSpanishLetterHome")) {
      var spanishLetterTT = new YAHOO.widget.Tooltip("whatIsSpanishLetterHomeTT", {
        context: "whatIsSpanishLetterHome",
        text: "<p>" + ixlLocalizedText.getText("marketing.tooltip.email_dialog.spanish_translation") + "</p>",
        autodismissdelay: 60000,
        width: "200px",
        xyoffset: [0, 11]
      });
      spanishLetterTT.showEvent.subscribe(ttShowListener);
      spanishLetterTT.hideEvent.subscribe(ttHideListener);
    }
  };

  /**
   * Event.onDOMReady
   */
  Event.onDOMReady(function() {
    marketingDialog = new FlowDialog("shareDialog",
    {
      buttons:[
        { text: "Send e-mail",
          img: "send",
          handler: "submit"
        },
        FlowDialog.CANCEL_BUTTON],
      links: ["sharelink"],
      response_type: "json",
      width: "700px"
    });

    // marketingDialog.setHeader("Tell a friend");
    marketingDialog.beforeShowEvent.subscribe(function() {
      Dom.setStyle(this.element, "display", "block");
    });


    marketingDialog.responseEvent.subscribe(function() {
      if (Dom.get("shareconfirm")) {
        this.cfg.setProperty("buttons", [
          { text: "Continue", handler: "cancel",
            img: "forward"
          }]);
        this.cfg.setProperty("width", "500px");
        this.center();
      }

      if (Dom.get("whatIsAdditionalEmailAddresses")) {
        renderAtHomeTooltips();
      }
    });

    marketingDialog.hideEvent.subscribe(function() {
      Dom.setStyle(this.element, "display", "none");
      this.cfg.resetProperty("buttons");
      this.cfg.resetProperty("width");
    });

    // Load the marketing dialog if requested.
    IXLTopic.subscribe("loadTellFriend", function () {
      var sharelink = Dom.get('sharelink');
      if (sharelink) {
        YConnect.resetFormState();
        YConnect.asyncRequest('GET', sharelink.href, this.callback);
      }
    }, marketingDialog, true);


    // Add the SmartScore information panel and tooltip
    var smartScoreInfo = new FlowDialog("smartscoreInfo", {
      links: "smartscoreLink",
      buttons: [ FlowDialog.CLOSE_BUTTON ]
    });
    smartScoreInfo.setHeader(ixlLocalizedText.getText("marketing.smart_score.header"));

    // Only do the logic related to the smart score tooltip if the context element exists.
    conditionalCreate("smartscore", createSmartScoreTooltip, [smartScoreInfo]);

    // Add an information popover for problems signing in
    conditionalCreate("signinTrouble", createSigninTroubleDialog, []);

    // Add-email ajax form and placeholder text
    conditionalCreate("gradenotice", addEmail, []);
    conditionalCreate("fmRequestNewsletter", addEmail, []);

    // CSD drop list
    conditionalCreate("csd-arrow", setupCSDSelect, []);

    // Downtime message
    var downtimeMessgaeInfo = {
      buttonId: "hide-message-x-button",
      parentId: "downtime-message",
      cookieInfo: {
        name: "hide_downtime_message",
        value: "true",
        path: "/"
      }
    };
    conditionalCreate("downtime-message", setupCookieHandler, [downtimeMessgaeInfo]);

    // Cookie warning message
    var cookiePrivacyMessgaeInfo = {
      buttonId: "hide-cookie-privacy-banner-x-button",
      parentId: "cookie-privacy-message",
      cookieInfo: {
        name: "cookie_privacy_dismissed",
        value: "true",
        expires: new Date((new Date()).getTime() + 1000 * 60 * 60 * 24 * 365),
        path: "/"
      }
    };
    conditionalCreate("cookie-privacy-message", setupCookieHandler, [cookiePrivacyMessgaeInfo]);
  });

}());


