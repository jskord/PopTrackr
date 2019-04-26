//requires[util]: Intl
var ixlLocalizedText = PROD_YUI.IXL.Intl.getModule("util-StaticResources");

// Override _testIfFocusable to fix bug with VML (canvas tags in IE)
(function() {
  var Panel = YAHOO.widget.Panel;

  // Fix the bug in container.js related to VML.
  // We put the focusable[tagName] test first so that the VML tags aren't asked their "type"
  // (which fails on the shape object, because it's not a valid attribute of the v:shape node).
  Panel.prototype._testIfFocusable = function(el, focusable) {
    if (focusable[el.tagName.toLowerCase()] && el.focus && el.type !== "hidden" && !el.disabled) {
      return true;
    }
    return false;
  };
}());

// FlowDialog
(function () {

  /**
   * FlowDialog is a simple implementation of Dialog that handles flows within
   * the dialog.  This means that form submission doesn't necessarily hide the
   * dialog. Forms can be processed in 3 ways -- via an
   * asynchronous Connection utility call, a simple form POST or GET,
   * or manually.
   *
   * For z-index notes on FlowDialog, please see /yui3/ixl/site-nav/css/flowdialog.css.
   *
   * @namespace YAHOO.widget
   * @class FlowDialog
   * @extends YAHOO.widget.Dialog
   * @constructor
   * @param {String} el The element ID representing the FlowDialog
   * <em>OR</em>
   * @param {HTMLElement} el The element representing the FlowDialog
   * @param {Object} userConfig The configuration object literal containing
   * the configuration that should be set for this FlowDialog. See
   * configuration documentation for more details.
   */
  var FlowDialog = function (el, userConfig) {
    FlowDialog.superclass.constructor.call(this, el, userConfig);
  };

  var util = YAHOO.util,
      Connect = util.Connect,
      CustomEvent = util.CustomEvent,
      Dom = util.Dom,
      Event = util.Event,
      KeyListener = util.KeyListener,
      Lang = YAHOO.lang,
      UA = YAHOO.env.ua,

  /**
   * Constant representing the FlowDialog's configuration properties
   * @property DEFAULT_CONFIG
   * @private
   * @final
   * @type Object
   */
      DEFAULT_CONFIG = {

        "LINKS": {
          key: "links",
          value: [],
          suppressEvent: true
        },

        "RESPONSE_TYPE": {
          key: "response_type",
          value: "body",
          supressEvent: true
        },

        "SUBMIT_ON_ENTER": {
          key: "submit_on_enter",
          value: false,
          validator: Lang.isBoolean
        }

      };


  function removeButtonEventHandlers() {

    var aButtons = this._aButtons,
        nButtons,
        oButton,
        i;

    if (Lang.isArray(aButtons)) {
      nButtons = aButtons.length;

      if (nButtons > 0) {
        i = nButtons - 1;
        do {
          oButton = aButtons[i];

          if (oButton.tagName.toUpperCase() == "BUTTON") {
            Event.purgeElement(oButton);
            Event.purgeElement(oButton, false);
          }
        }
        while (i--);
      }
    }
  }

  FlowDialog.showMaskEvent = (function() {
    var ce = new CustomEvent("showMask");
    ce.signature = CustomEvent.FLAT;
    return ce;
  }());

  FlowDialog.hideMaskEvent = (function() {
    var ce = new CustomEvent("hideMask");
    ce.signature = CustomEvent.FLAT;
    return ce;
  }());

  FlowDialog.unknownAjaxFailure = (function() {
    var ce = new CustomEvent("unknownAjaxFailure");
    ce.signature = CustomEvent.FLAT;
    return ce;
  }());

  /**
   * Constant representing a typical Submit button
   * @property YAHOO.widget.FlowDialog.SUBMIT_BUTTON
   * @private
   * @final
   * @type Object
   */
  FlowDialog.SUBMIT_BUTTON = {
    text: ixlLocalizedText.getText("flowdialog.submit"),
    img: "check",
    handler: function() { this.submit(); }
  };

  /**
   * Constant representing a typical Cancel button
   * @property YAHOO.widget.FlowDialog.CANCEL_BUTTON
   * @private
   * @final
   * @type Object
   */
  FlowDialog.CANCEL_BUTTON = {
    text: ixlLocalizedText.getText("flowdialog.cancel"),
    handler: function() { this.cancel(); },
    cancel: true
  };

  /**
   * Constant representing a typical Close button
   * @property YAHOO.widget.FlowDialog.CLOSE_BUTTON
   * @private
   * @final
   * @type Object
   */
  FlowDialog.CLOSE_BUTTON = {
    text: ixlLocalizedText.getText("flowdialog.close"),
    handler: function() { this.cancel(); },
    cancel: true
  };

  /**
   * Constant representing the default CSS class used for a FlowDialog
   * @property YAHOO.widget.FlowDialog.CSS_FLOWDIALOG
   * @static
   * @final
   * @type String
   */
  FlowDialog.CSS_FLOWDIALOG = "yui-flow-dialog";

  /**
   * Constant representing the data attribute used to identify the type of flowdialog, because
   * current setup always have the Flowdialog "id" attribute containing "loginDialog".
   * @property YAHOO.widget.FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG
   * @static
   * @final
   * @type String
   */
  FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG = 'data-dlg-id';

  /**
   * Constant for "data-dlg-id" attribute for non-signed in version of 20 question limit pop over.
   * @property YAHOO.widget.FlowDialog.DATA_ID_20_QUESTION_LIMIT_POPOVER_NOT_LOGGED_IN
   * @static
   * @final
   * @type String
   */
  FlowDialog.DATA_ID_QUESTION_LIMIT_NOT_LOGGED_IN = 'QuesLimitNotLogIn';

    /**
     * Constant for "data-dlg-id" attribute for non-signed in version of 10 question limit pop over
     * when the subject practiced is not available in the edition.
     * @property YAHOO.widget.FlowDialog.DATA_ID_QUESTION_LIMIT_NOT_LOGGED_IN_SUBJECT_UNAVAILABLE
     * @static
     * @final
     * @type String
     */
    FlowDialog.DATA_ID_QUESTION_LIMIT_NOT_LOGGED_IN_SUBJECT_UNAVAILABLE =
      'QuesLimitNotLogInSubjectUnavailable';

  /**
   * Constant for "data-dlg-id" attribute for signed in version of 20 question limit pop over.
   * @property YAHOO.widget.FlowDialog.DATA_ID_QUESTION_LIMIT_LOGGED_IN
   * @static
   * @final
   * @type String
   */
  FlowDialog.DATA_ID_QUESTION_LIMIT_LOGGED_IN = 'QuesLimitLogIn';

  // Create a common method that handles AJAX failures
  FlowDialog.ajaxFailure = function(o) {
    var sHTML = o.responseText,
        sTitle = null,
        nStatus = o.status;

    // Handle 403 errors differently
    if (nStatus === 403) {
      window.location.reload(true); // bug 22029 - ikim 4/15/2010
      return;
    }

    if (sHTML) {
      try {
        sTitle = sHTML.match(/<title>(.*)<\/title>/)[1];
      } catch(e) {}
    }
    else if (nStatus != 0 && nStatus != -1) {
      if (FlowDialog.unknownAjaxFailure.fire(nStatus)) {
        sHTML =
            "<div><h2>IXL Internal Error</h2>" +
            "<h3>" + o.status + "</h3>" +
            "<span class=\"error1\">Argh!</span> " +
            "<span class=\"desc1\">IXL hit an unexpected problem while trying " +
            "to service your request. Please try again later. If this problem " +
            "persists, or if it seems to \"always\" happen, please contact " +
            "<a href=\"/help\">IXL Support</a>. " +
            "In your message, please be specific about what you were trying to " +
            "do  when this error occurred.</span></div>";
      }
    }
    // If we have a communication error, then reload the page.
    else {
      window.location.reload(true);
      return;
    }

    if (sHTML) {
      try {
        document.title = "IXL Internal Error";
        var db = document.body;
        db.innerHTML = sHTML;
        Dom.addClass(db, "internalError");
        // sending a pageview event to google analytics when uh-oh occurs after page load
        // The default pageview event should automatically send over the page title and url
        // For us to know that the current url happened on a page with "IXL Internal Error"
        // as the title.
        var gaq = window['gaq'];
        if (gaq) {
          gaq('send', 'pageview');
        }
      } catch(e) {}
    }

  };

  Lang.extend(FlowDialog, YAHOO.widget.Dialog, {

    bringToTop: function(ev) {

      var Overlay = YAHOO.widget.Overlay,
          iZindex = this.cfg.getProperty('zindex'),
          bIgnoreCalculatedZindex = this.cfg.getProperty('ignoreCalculatedZindex'),
          aOverlays = [],
          oElement = this.element;

      if (iZindex && bIgnoreCalculatedZindex) {
        return;
      }

      function compareZIndexDesc(p_oOverlay1, p_oOverlay2) {

        var sZIndex1 = Dom.getStyle(p_oOverlay1, "zIndex"),
            sZIndex2 = Dom.getStyle(p_oOverlay2, "zIndex"),

            nZIndex1 = (!sZIndex1 || isNaN(sZIndex1)) ? 0 : parseInt(sZIndex1, 10),
            nZIndex2 = (!sZIndex2 || isNaN(sZIndex2)) ? 0 : parseInt(sZIndex2, 10);

        if (nZIndex1 > nZIndex2) {
          return -1;
        } else if (nZIndex1 < nZIndex2) {
          return 1;
        } else {
          return 0;
        }
      }

      function isOverlayElement(p_oElement) {

          var isOverlay = Dom.hasClass(p_oElement, Overlay.CSS_OVERLAY),
              addToZindexCalculation = Dom.hasClass(p_oElement, 'add-to-zindex-calculation'),
              Panel = YAHOO.widget.Panel;

          if (isOverlay && !Dom.isAncestor(oElement, p_oElement)) {
            if (Panel && Dom.hasClass(p_oElement, Panel.CSS_PANEL)) {
                aOverlays[aOverlays.length] = p_oElement.parentNode;
            } else {
                aOverlays[aOverlays.length] = p_oElement;
            }
          }

          if (addToZindexCalculation) {
            aOverlays[aOverlays.length] = p_oElement;
          }
      }

      Dom.getElementsBy(isOverlayElement, "div", document.body);

      aOverlays.sort(compareZIndexDesc);

      var oTopOverlay = aOverlays[0],
          nTopZIndex;

      if (oTopOverlay) {
          nTopZIndex = Dom.getStyle(oTopOverlay, "zIndex");

          if (!isNaN(nTopZIndex)) {
              var bRequiresBump = false;

              if (oTopOverlay != oElement) {
                  bRequiresBump = true;
              } else if (aOverlays.length > 1) {
                  var nNextZIndex = Dom.getStyle(aOverlays[1], "zIndex");
                  // Don't rely on DOM order to stack if 2 overlays are at the same zindex.
                  if (!isNaN(nNextZIndex) && (nTopZIndex == nNextZIndex)) {
                      bRequiresBump = true;
                  }
              }
              if (bRequiresBump) {
                this.cfg.setProperty("zindex", (parseInt(nTopZIndex, 10) + 2));
              }
          }
      }
    },

  /**
   * Initializes the class's configurable properties which can be changed
   * using the FlowDialog's Config object (cfg).
   * @method initDefaultConfig
   */
    initDefaultConfig: function () {

      FlowDialog.superclass.initDefaultConfig.call(this);

      /**
       * The internally maintained callback object for use with the
       * Connection utility
       * @property callback
       * @type Object
       */
      this.callback = {

        /**
         * The function to execute upon success of the
         * Connection submission
         * @property callback.success
         * @type Function
         */
        success: function(o) {
          var me = o.argument['dialog'];

          if (o.status == 204 || isBlank(o.responseText)) {
            me.complete();
          }
          else {
            me.handleResponse(o.responseText);
          }
        },

        /**
         * The function to execute upon successful file upload of the Connection submission.
         * As of YUI 2.9, for the Connection Manager: JSON and HTML response, in file upload
         * response, are now evaluated as text, avoiding HTML entity issues. The response we
         * want to pass to handleResponse should not be evaluated as text, so we use
         * o.responseXML.body.innerHTML instead of o.responseText. - bug 29628 - ikim 26 Aug 2011
         * @property callback.upload
         * @type Function
         */
        upload: function(o) {
          var me = o.argument['dialog'],
              responseText = o.responseXML.body.innerHTML;

          if (isBlank(responseText)) {
            me.complete();
          }
          else {
            me.handleResponse(responseText);
          }
        },

        /**
         * The function to execute upon failure of the
         * Connection submission
         * @property callback.failure
         * @type Function
         */
        failure: FlowDialog.ajaxFailure,

        /**
         * The arbitraty argument or arguments to pass to the Connection
         * callback functions
         * @property callback.argument
         * @type Object
         */
        argument: {dialog: this}

      };


      // Add dialog config properties //

      /**
       * For bug 70451, 39821 - set a boolean to tell FlowDialog to use z-index value specified
       * in user config and ignore the value calculated in YAHOO.widget.FlowDialog.bringToTop,
       * which overrides YAHOO.widget.Overlay.bringToTop.
       * @type boolean
       * @default false
       */
      this.cfg.addProperty('ignoreCalculatedZindex', {
        value: false
      });

      /**
       * Sets the links for the FlowDialog
       * @config links
       * @type Array
       * @default []
       */
      this.cfg.addProperty(DEFAULT_CONFIG.LINKS.key, {
        handler: this.configLinks,
        value: DEFAULT_CONFIG.LINKS.value,
        suppressEvent: DEFAULT_CONFIG.LINKS.suppressEvent,
        supercedes: DEFAULT_CONFIG.LINKS.supercedes
      });

      /**
       * Sets the response_type for the FlowDialog
       * @config response_type
       * @type Array
       * @default []
       */
      this.cfg.addProperty(DEFAULT_CONFIG.RESPONSE_TYPE.key, {
        value: DEFAULT_CONFIG.RESPONSE_TYPE.value,
        suppressEvent: DEFAULT_CONFIG.RESPONSE_TYPE.suppressEvent,
        supercedes: DEFAULT_CONFIG.RESPONSE_TYPE.supercedes
      });

      /**
       * Specifies whether the dialog submits when the enter key is pressed
       * @config submit_on_enter
       * @type Boolean
       * @default false
       */
      this.cfg.addProperty(DEFAULT_CONFIG.SUBMIT_ON_ENTER.key, {
        handler: this.configSubmitOnEnter,
        value: DEFAULT_CONFIG.SUBMIT_ON_ENTER.value,
        suppressEvent: DEFAULT_CONFIG.SUBMIT_ON_ENTER.suppressEvent,
        supercedes: DEFAULT_CONFIG.SUBMIT_ON_ENTER.supercedes
      });

      // Change the default behavior
      this.cfg.applyConfig({
        constraintoviewport: true,
        // bug 31282 - IXL pop-over "fixedcenter:true" is not user-friendly on iPad/mobile devices
        fixedcenter: !(UA.ios || UA.mobile),
        modal: true,
        hideaftersubmit: false,
        strings: {
          close: ''
        }
      }, true);

    },

    /**
    * Initializes the custom events for Dialog which are fired
    * automatically at appropriate times by the Dialog class.
    * @method initEvents
    */
    initEvents: function () {

      FlowDialog.superclass.initEvents.call(this);

      this.completeEvent = this.createEvent("complete");
      this.completeEvent.signature = CustomEvent.LIST;

      this.responseEvent = this.createEvent("response");
      this.responseEvent.signature = CustomEvent.LIST;
    },


  /**
   * The FlowDialog initialization method, which is executed for
   * FlowDialog and all of its subclasses. This method is automatically
   * called by the constructor, and  sets up all DOM references for
   * pre-existing markup, and creates required markup if it is not
   * already present.
   * @method init
   * @param {String} el The element ID representing the FlowDialog
   * <em>OR</em>
   * @param {HTMLElement} el The element representing the FlowDialog
   * @param {Object} userConfig The configuration object literal
   * containing the configuration that should be set for this
   * FlowDialog. See configuration documentation for more details.
   */
    init: function (el, userConfig) {

      // bug 69567 - A/B test different 20 Question Limit popover mockups.
      // Using CSS is ideal but there is no selector for different YUI 2 IXL flowdialog.
      //
      // To implmenet that, we have a patch: adding a "data-dlg-id" attribute with unique
      // name when we render a specific flowdialog popover. See /static/math/account/login.js
      // for example. We added "data-dlg-id=QuesLimitNotLogIn" when "showPracticeLimit" is
      // fired and corresponding functions are invoked.
      //
      // Of course, we need to remove whatever the value in "data-dlg-id" when the content
      // in flowdialog changes.  So, we remove "data-dlg-id" attribute when "cahngeBodyEvent"
      // or "hideEvent" is called.
      //
      // YUI2 does not support DOM.setAttribute when it comes to attribute with "data-" prefix.
      // So, we use the native one, which is safe nowadays.
      var fRemoveDataFlowDialogAttribute = function(el) {
        if (el && el.setAttribute) {
          el.setAttribute(FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG, '');
        }
      };

      /*
          Note that we don't pass the user config in here yet because we
          only want it executed once, at the lowest subclass level
      */
      FlowDialog.superclass.init.call(this, el/*, userConfig*/);

      this.beforeInitEvent.fire(FlowDialog);

      Dom.addClass(this.element, FlowDialog.CSS_FLOWDIALOG);

      if (userConfig) {
        var sKey,
            oConfig = {};

        // Properties we don't want queued go here:
        oConfig[DEFAULT_CONFIG.LINKS.key] = null;
//        oConfig[DEFAULT_CONFIG.RESPONSE_TYPE.key] = null;

        // Since properties are queued until the render event, we need to setup
        // a couple of properties manually so that they are available before
        // the dialog is rendered. We then remove them from the userConfig
        // variable so they don't get queued (causes problems when calling set
        // before the dialog is rendered).
        for (sKey in oConfig) {
          if (Lang.hasOwnProperty(userConfig, sKey) && userConfig[sKey] != null) {
            oConfig[sKey] = userConfig[sKey];
            this.cfg.setProperty(sKey, userConfig[sKey]);
            delete userConfig[sKey];
          }
        }

        this.cfg.applyConfig(userConfig, true);

        // Add the config variables that we removed from the userConfig into
        // the initialConfig variable so we maintain the transparency of the
        // userConfig concept.
        for (sKey in oConfig) {
          if (Lang.hasOwnProperty(oConfig, sKey) && oConfig[sKey] != null) {
            this.cfg.initialConfig[sKey] = oConfig[sKey];
          }
        }
      }

      this.beforeRenderEvent.subscribe(function () {
        if (! this.body) {
          this.setBody("");
        }
        if (! this.footer) {
          this.setFooter("");
        }
      }, this, true);

      this.initEvent.fire(FlowDialog);

      // Disable buttons when the form is submitted.
      this.beforeSubmitEvent.subscribe(function() {
        this.setButtonDisabled(true);
      });

      // Enable buttons when the body changes.
      this.changeBodyEvent.subscribe(function() {
        this.setButtonDisabled(false);
      });


      // Enable the buttons when the dialog is hidden.
      this.hideEvent.subscribe(function() {
        this.setButtonDisabled(false);
      });

      // Implement data-flowdialog attribute to differentiate different flow dialog,
      // please see notes for function fRemoveDataFlowDialogAttribute.
      this.changeBodyEvent.subscribe(function() {
        fRemoveDataFlowDialogAttribute(this.element);
      });

      // Implement data-flowdialog attribute to differentiate different flow dialog,
      // please see notes for function fRemoveDataFlowDialogAttribute.
      this.hideEvent.subscribe(function() {
        fRemoveDataFlowDialogAttribute(this.element);
      });

      // Update the styles of the footer to reflect if it has buttons.
      this.changeFooterEvent.subscribe(function() {
        if (this.footer.innerHTML == "") {
          Dom.addClass(this.footer, "emptyft");
        }
        else {
          Dom.removeClass(this.footer, "emptyft");
        }
      });

      this.responseEvent.subscribe(this.center);
      // With YUI2.9.0 and IE6, "focusFirst" method would cause silent error as a call back
      // function for "responseEvent.subscribe" method, which render all responseEvent useless.
      //
      // this.responseEvent.subscribe(this.focusFirst);
      this.focusFirstWrapperFunc = function() {
        this.focusFirst();
      };
      this.responseEvent.subscribe(this.focusFirstWrapperFunc);

      this.maxHeight = 425;

      // IE6 doesn't have max height, so emulate it here
      var nIE = YAHOO.env.ua.ie;

      // Fix bug 12416 -ecurtis 3/4/08
      // We don't want addFocusEventHandlers and removeFocusEventHandlers
      // to be called every time we hide and show a dialog.  It causes
      // serious problems in IE.
      if (nIE) {
        this.unsubscribeAll("showMask");
        this.unsubscribeAll("hideMask");
      }

      // Fix bug 12506 -ecurtis 3/11/08
      // Make sure the dialog fits when the viewport is small.
      function checkWindowHeight() {
        var height = Dom.getViewportHeight();
        if (height < 630) {
          this.maxHeight = 425 - (630 - height);
          if (this.maxHeight < 200) this.maxHeight = 200;
          Dom.setStyle(this.body, "max-height", this.maxHeight + "px");
        }
        else {
          this.maxHeight = 425;
          Dom.setStyle(this.body, "max-height", "");
        }
      }

      this.showMaskEvent.subscribe(function() {
        FlowDialog.showMaskEvent.fire(this);
      });
      this.hideMaskEvent.subscribe(function() {
        FlowDialog.hideMaskEvent.fire(this);
      });

      YAHOO.widget.Overlay.windowResizeEvent.subscribe(checkWindowHeight, this, true);
      this.renderEvent.subscribe(checkWindowHeight, this, true);

    },

    /**
    * Submitting a dialog is not valid if the buttons are disabled.
    * @method validate
    */
    validate: function () {
      var btns = this.getButtons(),
          firstButton;
      if (btns && btns.length) {
        firstButton = btns[0];
        if (Lang.isFunction(firstButton.get)) {
          return !firstButton.get('disabled');
        }
        else {
          return !firstButton.disabled;
        }
      }
      return true;
    },


    /**
    * Executes the complete of the Dialog followed by a hide.
    * @method cancel
    */
    complete: function () {
        this.completeEvent.fire();
        this.hide();
    },

    /**
    * @method setButtonDisabled
    * @description Sets the value of the dialog's buttons "disabled" attribute.
    * @param {Boolean} p_bDisabled Boolean indicating the value for
    * the dialog's buttons "disabled" attribute.
    */
    setButtonDisabled: function (p_bDisabled) {
      var YUIButton = YAHOO.widget.Button;
      var i = 0, nButtons = 0, aButtons, oButton;
      if (this._aButtons) {
        aButtons = this._aButtons;
        nButtons = aButtons.length;
      }
      for (; i < nButtons; i++) {
        oButton = aButtons[i];
        oButton.disabled = p_bDisabled;
      }
    },

    /**
    * @method handleResponse
    * @description Handle's the response of a successful dialog submission
    * @param {String} rawResponse Unparsed response text.
    */
    handleResponse: function (rawResponse) {

      var flowdialogContainer = this.element;

      if (!this.rendered) {
        this.render(document.body);
      }

      switch (this.cfg.getProperty("response_type")) {
        case "json":
          this.handleJSONResponse(rawResponse);
          break;
        case "body":
        default:
          this.setBody(rawResponse);
          break;
      }

      if (!this.cfg.getProperty("visible")) {
        this.show();
      }

      // bug 108694: (X) icons were misplaced in signin subaccount popover for PC and Mac Chromes.
      // Chromes seems to forget to render one last time to position the (x) icons. There isn't
      // a good fix, because we are trying to compensate for the browser behavior.
      //
      // We noticed that if we identify the popover early in the rendering cycle, and have
      // a CSS width for it.  The (x) icons seems to behave.
      //
      // To identify popover, we have put in patchs before that would transfer unique value
      // specified by the key of "jspSource" of JSON-formmated JSP files to the "data-dlg-id"
      // attribute of the DOM container of a particular Flowdialog. Usually, this takes
      // place at various life cycle of Flowdialog widget, specificied in class exteneded
      // from Flowdialog. For bug 108694, we attempted to formalize this proccess but encountered
      // difficulties.
      //
      // We tried to pick one rendering event that we could use: render, show, changeBody, or
      // response.  For now, it seems unreliable because if we utilize "response" event,
      // it would override previous "data-dlg-id" implementation.
      //
      // If we use "show" event, "render" event could have triggered it prematurely if "visible"
      // is set true for config object.  If we use "render" event, "changeBody" event will
      // reset "data-dlg-id" because we use "changeBody" event may reset "data-dlg-id"
      // attribute, because we use that event to reset "data-dlg-id".  It is necessary as shown
      // in example of "subaccount login" popover transforming into "enter pin" popover.
      if (this._sJspSource && flowdialogContainer && flowdialogContainer.setAttribute) {
        flowdialogContainer.setAttribute(FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG, this._sJspSource);
        flowdialogContainer.setAttribute('role', 'dialog');
        flowdialogContainer.setAttribute('aria-labelledby', this.header.innerText);
      }

      this.responseEvent.fire();
    },

    doBeforeApplyJSONConfig: function(oResponse) {
      // Set the header and body if they're given.  Use the delete operator
      // after setting the properties to remove it from the jsonObj so we can
      // treat the rest of it as a userConfig object.

      if (oResponse.header) {
        this.setHeader(oResponse.header);
        delete oResponse.header;
      }

      if (oResponse.body) {
        this.setBody(oResponse.body);
        delete oResponse.body;
      }

      // BP-8889 xxiong used specifically for editbillingwaitpage.jsp to hide the footer
      if (oResponse.footer === "hideFooter") {
        this.setFooter("");
        delete oResponse.footer;
      }

      // Convert the "close" config variable to a boolean.
      var sClose = "close";
      if (Lang.isString(oResponse[sClose])) {
        oResponse[sClose] = (oResponse[sClose] === "false" ? false : true);
      }

      return true;
    },

    /**
    * @method handleJSONResponse
    * @description Handle's the response as a JSON reponse
    * @param {String} rawResponse Unparsed response text.
    */
    handleJSONResponse: function (rawResponse) {
      var oResponse;

      // Parse the response
      oResponse = JSON.parse(rawResponse)

      // If there wasn't a response, all is not well in the world.
      if (!oResponse) {
        return false;
      }

      return this.applyJSONResponse(oResponse);
    },

    /**
     * @method applyJSONResponse
     * @description Applies the response as a JSON reponse
     * @param {Object} oResponse Parsed JSON response.
     */
    applyJSONResponse: function (oResponse) {

      var fireQueue = this.doBeforeApplyJSONConfig(oResponse);

      // bug 134199: temporary fix to validate family account management popover form
      var sErrorNeedToSelectNewPackage = '';
      var sExistingFamilyProduct = '';
      var ixlLocalizedText;
      var fSnapShootFamilyAccountProudctForm = function(bCaptureExisting) {

        var sExistingProduct = '',
            sPlanIndexCssClass = 'radio-plan-index',
            sElectiveOptionCssClass = 'check-elective-option',
            nlPlanIndex,
            nlElectiveOptions,
            i,
            nTemp;

        nlPlanIndex = Dom.getElementsByClassName(sPlanIndexCssClass);
        nlElectiveOptions = Dom.getElementsByClassName(sElectiveOptionCssClass);
        for (i = 0; i < nlPlanIndex.length; i++) {
          nTemp = nlPlanIndex[i];
          sExistingProduct = sExistingProduct + ';' +
            Dom.getAttribute(nTemp, 'name') + ':' +
            Dom.getAttribute(nTemp, 'value') + ':' + (bCaptureExisting ?
              Dom.getAttribute(nTemp, 'data-existing') : Dom.getAttribute(nTemp, 'checked'));
        }
        for (i = 0; i < nlElectiveOptions.length; i++) {
          nTemp = nlElectiveOptions[i];
          sExistingProduct = sExistingProduct + ';' +
            Dom.getAttribute(nTemp, 'name') + ':' +
            Dom.getAttribute(nTemp, 'value') + ':' + (bCaptureExisting ?
            Dom.getAttribute(nTemp, 'data-existing') : Dom.getAttribute(nTemp, 'checked'));
        }
        return sExistingProduct;
      };
      // end of temporary fix for bug 134199

      if (this._bPreventJspWidthOverride && oResponse.width) {
        delete oResponse.width;
      }

      if (oResponse.jspSource) {

        var nlLables;

        this._sJspSource = oResponse.jspSource;

        // bug 134199: temporary fix to validate family account management popover form
        if (this._sJspSource === 'yui-dialog-change-products') {

          // add following line to invoke onclick on input[type=radio]
          nlLables = Dom.getElementsByClassName('label-act-manage-product-option-invoke-click');
          if (nlLables && nlLables[0]) {
            nlLables[0].onclick.apply(nlLables[0]);
          }

          if (PROD_YUI) {
            ixlLocalizedText = PROD_YUI.IXL.Intl.getModule("util-StaticResources");
            if (ixlLocalizedText) {
              sErrorNeedToSelectNewPackage =
                ixlLocalizedText.getRaw('changeproducts.messages.need_select_new_package');
            }
          }

          sExistingFamilyProduct = fSnapShootFamilyAccountProudctForm(true);

          this.validate = function() {

            var sNewFamilyProduct = fSnapShootFamilyAccountProudctForm(false);
            var nAddRemoveError = null;

            if (sExistingFamilyProduct === sNewFamilyProduct) {
              nAddRemoveError = document.querySelector('.warning-add-or-remove-products');
              if (nAddRemoveError) {
                nAddRemoveError.innerHTML = sErrorNeedToSelectNewPackage;
                Dom.addClass(nAddRemoveError, 'warning-add-or-remove-products-visible');
                Dom.addClass(nAddRemoveError, 'warning-add');
              }
              return false;
            }
            return true;
          };
        }
        // end of temporary fix for bug 134199
      }

      this.cfg.applyConfig(oResponse);

      if (fireQueue) {
        this.cfg.fireQueue();
      }

      if (oResponse.footer) {
        var el = document.createElement("span");
        el.innerHTML = "<br />" + oResponse.footer;

        this.footer.appendChild(el);
        delete oResponse.footer;
      }
    },

      /**
    * @method beforeOpenDialogFromLink
    * @description Overrideable function to munge the href.  Default is to just
    * return the href as it was. If href is missing, look for ancestor DOM that has href.
    * @param {String} href Unmunged href that's going to be the ajax request.
    * @param {Event} [ev] the event
    * @return {String} munged href
    */
    beforeOpenDialogFromLink: function (href, ev) {
      var oTarget,
          oAncestor;
      if (!href) {
        oTarget = Event.getTarget(ev);
        if (oTarget) {
          /* PRODUCT-21728: we should also check if the target itself is already a link
           * before moving on to check its ancestors.
           */
          if (oTarget.href) {
            href = oTarget.href;
          } else {
            oAncestor = Dom.getAncestorBy(oTarget, function(el) {
              return el && el.href;
            });
            if (oAncestor) {
              href = oAncestor.href;
            }
          }
        }
      }
      return href;
    },

    openDialogFromEvent: function(ev) {
      var link = ev.currentTarget;
      var href = this.beforeOpenDialogFromLink(Dom.getAttribute(link, 'href'), ev);
      Event.preventDefault(ev);
      this.openDialogFromHref(href);
    },

    openDialogFromHref: function(href) {
      Connect.resetFormState();
      Connect.asyncRequest('GET', href, this.callback);
    },

    removeLinkEventHandlers: function() {
      var aLinks = this._aLinks;
      if (Lang.isArray(aLinks)) {
        Event.removeListener(aLinks, "click", this.openDialogFromEvent);
      }
    },

  // BEGIN BUILT-IN PROPERTY EVENT HANDLERS //

  /**
   * Fired when the "submit_on_enter" property is set.
   * @method configSubmitOnEnter
   * @param {String} type The CustomEvent type (usually the property name)
   * @param {Object[]} args The CustomEvent arguments. For configuration
   * handlers, args[0] will equal the newly applied value for the property.
   * @param {Object} obj The scope object. For configuration handlers,
   * this will usually equal the owner.
   */
    configSubmitOnEnter: function (type, args, obj) {
      var submitOnEnter = this['submitOnEnter'];
      if (args[0] && !submitOnEnter) {
        submitOnEnter = new KeyListener(this.element,
          { keys: [KeyListener.KEY.ENTER, 3] },
          { fn: function(type, o) { this.submit(); }, scope: this,
            correctScope: true});

        this.showEvent.subscribe(submitOnEnter.enable, submitOnEnter, true);
        this.hideEvent.subscribe(submitOnEnter.disable, submitOnEnter, true);
        this.submitOnEnter = submitOnEnter;

        if (this.cfg.getProperty("visible")) {
          submitOnEnter.enable();
        }
      }
      else if (submitOnEnter) {
        this.showEvent.unsubscribe(submitOnEnter.enable);
        this.hideEvent.unsubscribe(submitOnEnter.disable);
        delete this.submitOnEnter;
      }
    },

  /**
   * Fired when the "links" property is set.
   * @method configLinks
   * @param {String} type The CustomEvent type (usually the property name)
   * @param {Object[]} args The CustomEvent arguments. For configuration
   * handlers, args[0] will equal the newly applied value for the property.
   * @param {Object} obj The scope object. For configuration handlers,
   * this will usually equal the owner.
   */
    configLinks: function (type, args, obj) {
      this.removeLinkEventHandlers();

      var links = args[0];
      this._aLinks = Lang.isArray(links) ? links : [links];
      Event.addListener(links, "click", this.openDialogFromEvent, this, true);
    },

    /**
    * The default event handler for the "buttons" configuration property
    * @method configButtons
    * @param {String} type The CustomEvent type (usually the property name)
    * @param {Object[]} args The CustomEvent arguments. For configuration
    * handlers, args[0] will equal the newly applied value for the property.
    * @param {Object} obj The scope object. For configuration handlers,
    * this will usually equal the owner.
    */
    configButtons: function (type, args, obj) {
      var aButtons = args[0],
          oInnerElement = this.innerElement,
          oButton,
          oButtonEl,
          nButtons,
          oSpan,
          oFooter,
          i;

      removeButtonEventHandlers.call(this);

      this._aButtons = null;

      if (Lang.isArray(aButtons) && aButtons.length > 0) {

        oSpan = document.createElement("span");
        oSpan.className = "button-group";
        nButtons = aButtons.length;

        this._aButtons = [];
        this.defaultHtmlButton = null;

        for (i = 0; i < nButtons; i++) {
          oButton = aButtons[i];

          // If the button is supposed to be a link button, create the button as an <A href>.
          if (Lang.isString(oButton.handler) &&
              oButton.handler.indexOf("href=") === 0)
          {
            oButtonEl = document.createElement("a");
            oButtonEl.href = oButton.handler.substring(5) || window.location.pathname;
          }
          else {
            oButtonEl = document.createElement("button");
            oButtonEl.setAttribute("type", "button");
          }

          oButtonEl.className = "crisp-button";

          if (oButton.isDefault) {
            Dom.addClass(oButtonEl, 'default');
            this.defaultHtmlButton = oButtonEl;
          }

          // Make the button "secondary" if it's set to true
          if (oButton.secondary) {
            Dom.addClass(oButtonEl, 'crisp-button-secondary');
          }

          if (oButton.cancel) {
            Dom.addClass(oButtonEl, 'crisp-button-cancel');
          }

          oButtonEl.innerHTML = oButton.text;
          oButtonEl.id = oButton.id;

          // Convert string handlers to functions
          if (Lang.isString(oButton.handler)) {
            if (oButton.handler === "submit") {
              oButton.handler = this.submit;
            }
            else if (oButton.handler === "cancel") {
              oButton.handler = this.cancel;
            }
            else if (oButton.handler === "complete") {
              oButton.handler = this.complete;
            }
          }

          if (Lang.isFunction(oButton.handler)) {
            Event.on(oButtonEl, "click", oButton.handler, this, true);
          }
          else if (Lang.isObject(oButton.handler) && Lang.isFunction(oButton.handler.fn)) {
            Event.on(oButtonEl, "click",
                oButton.handler.fn,
                ((!Lang.isUndefined(oButton.handler.obj)) ? oButton.handler.obj : this),
                (oButton.handler.scope || this));
          }

          oSpan.appendChild(oButtonEl);
          this._aButtons[this._aButtons.length] = oButtonEl;

          oButton.htmlButton = oButtonEl;

          if (i === 0) {
            this.firstButton = oButtonEl;
          }

          if (i === (nButtons - 1)) {
            this.lastButton = oButtonEl;
          }
        }

        this.setFooter(oSpan);

        oFooter = this.footer;

        if (Dom.inDocument(this.element) && !Dom.isAncestor(oInnerElement, oFooter)) {
          oInnerElement.appendChild(oFooter);
        }

        this.buttonSpan = oSpan;

      }
      else { // Do cleanup
        oSpan = this.buttonSpan;
        oFooter = this.footer;
        if (oSpan && oFooter) {
          oFooter.removeChild(oSpan);
          this.buttonSpan = null;
          this.firstButton = null;
          this.lastButton = null;
          this.defaultHtmlButton = null;
        }
      }

      this.changeContentEvent.fire();
    },

  // END BUILT-IN PROPERTY EVENT HANDLERS //

  /**
   * Removes the FlowDialog element from the DOM and removes all the listeners.
   * @method destroy
   */
    destroy: function () {
      this.removeLinkEventHandlers();
      FlowDialog.superclass.destroy.call(this);
    },

    render: function (appendToNode) {
      this.rendered = FlowDialog.superclass.render.call(this, appendToNode);
      return this.rendered;
    },

  /**
   * Private parameter used to prevent taking width data from JSP.
   * Even if we apply custom width somewhere else in our code for any flowdialog,
   * it can be overriden by width specified in the JSP JSON format.
   *
   * For A/B testing, this could be a problem as we want to initiate change on client side.
   * Adding this parameter to allow us to block that override.
   *
   * @property _bPreventJspWidthOverride
   * @type boolean
   */
  _bPreventJspWidthOverride: false,

  /**
   * Private parameter used to store a string that can be used to identify the content of the
   * popover. Will store the value of "jspSource" from server into this parameter.
   *
   * @property _sJspSource
   * @type string
   */
  _sJspSource: '',

  /**
   * Returns a string representation of the object.
   * @method toString
   * @return {String} The string representation of the FlowDialog
   */
    toString: function () {
      return "FlowDialog " + this.id;
    }

  });

  YAHOO.widget.FlowDialog = FlowDialog;

}());

// SimpleFlowDialog
(function() {
  var SimpleFlowDialog = function(el, userConfig) {
    SimpleFlowDialog.superclass.constructor.call(this, el, userConfig);
  };

  var Lang = YAHOO.lang,
      UA = YAHOO.env.ua;

  var FlowDialog = YAHOO.widget.FlowDialog;

  YAHOO.extend(SimpleFlowDialog, YAHOO.widget.SimpleDialog, {
    init: function(el, userConfig) {
      SimpleFlowDialog.superclass.init.call(this, el, userConfig);
      YAHOO.util.Dom.addClass(this.element, FlowDialog.CSS_FLOWDIALOG);

      // bug 31282 - IXL pop-over "fixedcenter:true" is not user-friendly on iPad/mobile devices
      // Center the pop-over to center when shown.
      // It is different from fixedcenter, which keeps pop-over centered at all time.
      this.showEvent.subscribe(this.center);
    },
    initDefaultConfig: function() {
      SimpleFlowDialog.superclass.initDefaultConfig.call(this);

      // Change the default behavior
      this.cfg.applyConfig({
        constraintoviewport: true,
        // bug 31282 - IXL pop-over "fixedcenter:true" is not user-friendly on iPad/mobile devices
        fixedcenter: !(UA.ios || UA.mobile),
        modal: true,
        strings: {
          close: ''
        }
      }, true);

    },
    configButtons: FlowDialog.prototype.configButtons,
    toString: function () {
      return "SimpleFlowDialog " + this.id;
    }
  });

  YAHOO.widget.SimpleFlowDialog = SimpleFlowDialog;
}());

// ChallengePanel
YAHOO.ixl.NotificationPanel = (function() {

  var util = YAHOO.util,
      widget = YAHOO.widget,
      Dom = util.Dom,
      Easing = util.Easing,
      ContainerEffect = widget.ContainerEffect,
      Overlay = widget.Overlay;

  ContainerEffect.BLIND_DOWN = function (overlay, dur) {

    var h = overlay.cfg.getProperty("height") ||
            Dom.getStyle(overlay.innerElement, "height");

    h = parseInt(h, 10);

    var bin = {
        attributes: {height:{from:0, to:h}},
        duration: dur,
        method: Easing.easeIn
    };

    var bout = {
        attributes: {height:{from:h, to:0}},
        duration: dur,
        method: Easing.easeOut
    };

    var blind = new ContainerEffect(overlay, bin, bout, overlay.innerElement);

    blind.handleStartAnimateIn = function (type,args,obj) {
      Dom.setStyle(obj.overlay.innerElement, "height", "0");
      Dom.setStyle(obj.overlay.element, "visibility", "visible");
    };

    blind.handleCompleteAnimateIn = function (type,args,obj) {
      obj.animateInCompleteEvent.fire();
    };

    blind.handleStartAnimateOut = function (type, args, obj) {

    };

    blind.handleCompleteAnimateOut =  function (type, args, obj) {
      Dom.setStyle(obj.overlay.element, "visibility", "hidden");
      Dom.setStyle(obj.overlay.innerElement, "height", h + "px");
      obj.animateOutCompleteEvent.fire();
    };

    blind.init();
    return blind;
  };

  var createPanel = function(body, configs) {

    // look for DIV.awards-nav-title-container, which indicates that we are on award gameboard page
    var nlAwardsNavTitleContainer = Dom.getElementsByClassName('awards-nav-title-container');
    var nBd = Dom.get("bd");
    var bAwardGameboardPage = false;

    var nAwardsNavTitleContainer,
        nPanel;

    // check to see if we are in award/gameboard page
    if (nlAwardsNavTitleContainer &&
          nlAwardsNavTitleContainer.length > 0 &&
          nlAwardsNavTitleContainer[0]) {
      bAwardGameboardPage = true;
      nAwardsNavTitleContainer = nlAwardsNavTitleContainer[0];
    }

    var oPanelConfig = {
      autofillheight: null,
      close: true,
      draggable: false,
      effect:{effect: ContainerEffect.BLIND_DOWN},
      fixedcenter: false,
      height: "20px",
      modal: false,
      strings: { close: "x" },
      underlay: "none",
      visible: true,
      width: "330px",
      zindex: 20
    };

    // merge default and argument configurations
    if (configs) {
      oPanelConfig = YAHOO.lang.merge(oPanelConfig, configs);
    }

    if (bAwardGameboardPage) {
      oPanelConfig.width = '160px';
      oPanelConfig.height = '50px';
      oPanelConfig.context = [nAwardsNavTitleContainer, "tr", "tr"];
    }

    nPanel = new YAHOO.widget.Panel("cPanel", oPanelConfig);

    if (body) {
      nPanel.setBody(body);
    }

    if (bAwardGameboardPage) {
      // on award/gameboard page, we will render nPanel title container.
      nPanel.render(nAwardsNavTitleContainer);
    }
    else {
      // on practice page, we will render nPanel directly under the breadcrumb nav,
      // in the #bd element.
      nPanel.render(nBd);
    }

    nPanel.unsubscribe('show', this.focusFirst);

    return nPanel;
  };

  return {
    create: createPanel
  };

}());

YAHOO.ixl.DataError = (function() {
  var createDialog = function() {
    var dlg = new YAHOO.widget.SimpleFlowDialog(YAHOO.util.Dom.generateId(), {
      buttons: [{
        text: "Continue",
        img: "forward",
        handler: function() {
          window.location.reload(true);
        }
      }],
      close: false,
      text: "<p style=\"text-align:left;\">" +
            "Some of your data may be slightly out of date. " +
            "Click <b>Continue</b> to refresh your data and try again." +
            "</p>",
      width: "450px"
    });
    dlg.setHeader("Refresh data");
    dlg.render(document.body);
  };

  return {
    createDialog: createDialog,
    ajaxFailure: function() { createDialog(); }
  };
}());

YAHOO.register("flowdialog", YAHOO.widget.FlowDialog,
               {version: "2.8.0", build: "1"});

// ModuleMask
(function () {
  var ModuleMask = function (el, userConfig) {
    ModuleMask.superclass.constructor.call(this, el, userConfig);
  };

  var Lang = YAHOO.lang,
      Dom = YAHOO.util.Dom;

  // Inherit from YAHOO.widget.Panel
  Lang.extend(ModuleMask, YAHOO.widget.Panel,
  {
    init: function (el, userConfig) {
      ModuleMask.superclass.init.call(this, el, userConfig);
      Dom.addClass(this.innerElement, "ixl-module-panel");
      this.showMaskEvent.subscribe(this.fixMask, this, true);
    },

    initDefaultConfig: function() {
      ModuleMask.superclass.initDefaultConfig.call(this);

      this.cfg.addProperty("xoffset", {
        value: 0,
        validator: Lang.isNumber
      });
      this.cfg.addProperty("yoffset", {
        value: 0,
        validator: Lang.isNumber
      });
    },

    configVisible: function (type, args, obj) {
      var visible = args[0],
          parentNode = this.element.parentNode;
      if (parentNode && parentNode != document.body) {
        var cover = this.element.parentNode.id;
        if (Dom.getStyle(cover, "display") == "none" ||
            Dom.getStyle(cover, "visibility") == "hidden") {
          visible = false;
        }
        args[0] = visible;
      }
      ModuleMask.superclass.configVisible.call(this, type, args, obj);

      Dom.setStyle(this.body, "display", (visible ? "block" : "none"));
    },

    center: function() {
      var elementWidth = this.element.offsetWidth;
      var elementHeight = this.element.offsetHeight;
      var x, y, scrollX, scrollY, viewPortWidth, viewPortHeight;
      if (this.element.parentNode == document.body) {
        scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
        scrollY = document.documentElement.scrollTop || document.body.scrollTop;
        viewPortWidth = Dom.getClientWidth();
        viewPortHeight = Dom.getClientHeight();
        x = (viewPortWidth / 2) - (elementWidth / 2) + scrollX;
        y = (viewPortHeight / 2) - (elementHeight / 2) + scrollY;
      }
      else {
        scrollX = this.cfg.getProperty("xoffset");
        scrollY = this.cfg.getProperty("yoffset");
        var cover = this.element.parentNode.id;
        var coverXY = Dom.getXY(cover);

        if (Dom.getStyle(cover, "position") == "relative") {
          coverXY = [0,0];
        }

        viewPortWidth = parseInt(Dom.getStyle(cover, 'width'));
        viewPortHeight = parseInt(Dom.getStyle(cover, 'height'));
        x = ((viewPortWidth / 2) - (elementWidth / 2) + scrollX) + coverXY[0];
        y = ((viewPortHeight / 2) - (elementHeight / 2) + scrollY) + coverXY[1];
      }

      this.element.style.left = parseInt(x, 10) + "px";
      this.element.style.top = parseInt(y, 10) + "px";
      this.syncPosition();

      this.cfg.refireEvent("iframe");
    },

    hideMask: function () {
      if (this.cfg.getProperty("modal") && this.mask) {
        this.mask.style.display = "none";
        this.hideMaskEvent.fire();
        if (this.element.parentNode == document.body) {
          Dom.removeClass(document.body, "masked");
        }
      }
    },

    showMask: function () {
      if (this.cfg.getProperty("modal") && this.mask) {
        if (this.element.parentNode == document.body) {
          Dom.addClass(document.body, "masked1234");
        }
        this.sizeMask();
        this.mask.style.display = "block";
        this.showMaskEvent.fire();
      }
    },

    sizeMask: function() {
      if (this.mask) {
        if (this.element.parentNode == document.body) {
          this.mask.style.height = Dom.getDocumentHeight() + "px";
          this.mask.style.width = Dom.getDocumentWidth() + "px";
        }
        else {
          this.fixMask();
        }
      }
    },

    fixMask: function() {
      if (this.mask) {
        var cover = this.element.parentNode.id;
        var xy = Dom.getXY(cover);
        this.mask.style.height = Dom.getStyle(cover, 'height');
        this.mask.style.width = Dom.getStyle(cover, 'width');
        Dom.setXY(this.mask, xy);
      }
    }
  });

  YAHOO.namespace("ixl.widget");
  YAHOO.ixl.widget.ModuleMask = ModuleMask;

}());

YAHOO.register("modulemask", YAHOO.ixl.widget.ModuleMask,
               {version: "2.8.0", build: "1"});

// AJAXTooltip
(function() {
  var AJAXTooltip = function (el, userConfig) {
    AJAXTooltip.superclass.constructor.call(this, el, userConfig);
  };

  var Lang = YAHOO.lang,
      util = YAHOO.util,
      Connect = util.Connect,
      Event = util.Event;

  Lang.extend(AJAXTooltip, YAHOO.widget.Tooltip, {

    init: function (el, userConfig) {
      if (userConfig) {
        Lang.augmentObject(userConfig, {
          preventoverlap: true,
          autodismissdelay: 10000,
          showdelay: 500,
          hidedelay: 0,
          underlay: "none"
        });
      }

      AJAXTooltip.superclass.init.call(this, el, userConfig);
    },

    initDefaultConfig: function () {
      AJAXTooltip.superclass.initDefaultConfig.call(this);

      this.cfg.addProperty("requestMethod", {
        value: "GET"
      });

      this.cfg.addProperty("requestURI", {
        value: null
      });

      this.cfg.addProperty("failureMessage", {
        value: "Unable to process request."
      });
    },

    doHide: function() {
      if (this.cfg.getProperty("autodismissdelay") == -1) {
        return null;
      }
      return AJAXTooltip.superclass.doHide.call(this);
    },

    // Override this function to pass post data along
    getPostData: function(context) {
      return "";
    },

    onContextMouseOver: function (e, obj) {
      var context = this;

      if (!isBlank(context.title) || !isBlank(obj.cfg.getProperty("text"))) {
        AJAXTooltip.superclass.onContextMouseOver.call(context, e, obj);
      }

      else {
        var method = obj.cfg.getProperty("requestMethod"),
            request = obj.cfg.getProperty("requestURI"),
            postData = obj.getPostData(context);

        if (postData === false) {
          return false;
        }

        // Stop the tooltip from being hidden (set on last mouseout)
        if (obj.hideProcId) {
            clearTimeout(obj.hideProcId);
            obj.hideProcId = null;
        }

        Event.on(context, "mousemove", obj.onContextMouseMove, obj);

        if (method == "GET") {
          request += postData;
          postData = null;
        }

        Connect.asyncRequest(method, request,
        {
          success: function(o) {
            var ctx = o.argument['context'];
            var tt = o.argument['tooltip'];
            ctx.title = o.responseText;
            if (tt.hideProcId == null) {
              tt.onContextMouseOver.call(ctx, null, tt);
            }
          },
          failure: function(o) {
            var ctx = o.argument['context'];
            var tt = o.argument['tooltip'];
            ctx.title = tt.cfg.getProperty("failureMessage");
            if (tt.hideProcId == null) {
              tt.onContextMouseOver.call(ctx, null, tt);
            }
          },

          argument: {context: context, tooltip: obj}
        }, postData);
      }
    }

  });

  YAHOO.widget.AJAXTooltip = AJAXTooltip;
}());

(function() {

  var Event = YAHOO.util.Event;

  var InteractiveTooltip = function() {
    InteractiveTooltip.superclass.constructor.apply(this, arguments);
  };

  YAHOO.extend(InteractiveTooltip, YAHOO.widget.AJAXTooltip, {
    onRender: function(p_sType, p_aArgs) {
      InteractiveTooltip.superclass.onRender.call(this, p_sType, p_aArgs);

      var oElement = this.element;
      Event.on(oElement, "mouseover", this.onSelfMouseOver, this);
      Event.on(oElement, "mousemove", this.onContextMouseMove, this);
      Event.on(oElement, "mouseout", this.onContextMouseOut, this);
    },
    onSelfMouseOver: function(e, obj) {
      if (obj.hideProcId) {
        clearTimeout(obj.hideProcId);
        obj.hideProcId = null;
      }
    }
  });

  YAHOO.widget.InteractiveTooltip = InteractiveTooltip;
}());

YAHOO.register("ajaxtooltip", YAHOO.widget.AJAXTooltip,
               {version: "2.8.0", build: "1"});

// YAHOO.util.Pulsate
(function() {

  var Pulsate = function(el, attributes, duration,  method) {
    if (el) { // dont break existing subclasses not using YAHOO.extend
      Pulsate.superclass.constructor.call(this, el, attributes, duration, method);
    }
  };

  Pulsate.NAME = 'Pulsate';

  // shorthand
  var Y = YAHOO.util,
      L = YAHOO.lang;

  L.extend(Pulsate, Y.ColorAnim);

  var superclass = Pulsate.superclass;
  var proto = Pulsate.prototype;

  proto.patterns.borderWidth = /^borderWidth/i;

  proto.init = function(el, attributes, duration, method) {
    // Duration is overloaded to include the number of times to repeat the
    // pulsation as well as the frequency of the pulsation
    if (L.isObject(duration)) {
      this.repeat = duration['repeat'] || 0;
      if (L.hasOwnProperty(duration, 'forceRound')) {
        this.forceRound = !!duration.forceRound;
      }
      if (L.hasOwnProperty(duration, 'frequency')) {
        duration = duration['frequency'];
      }
      else if (this.repeat) {
        duration = duration['duration'] / this.repeat;
      }
    }

    duration = (L.isNumber(duration) ? duration : 1);

    superclass.init.call(this, el, attributes, duration, method);

    // If the pulsation is supposed to repeat, set it up to do so
    if (this.repeat) {
      this._counter = 1;
      var totalData = {
        duration: 0,
        frames: 0
      };
      this.onComplete.subscribe(function(type, data) {
        if (this._counter !== this.repeat) {
          this._counter++;
          totalData.duration += data[0].duration;
          totalData.frames += data[0].frames;
          this.animate();
          return false;
        }
        else {
          this._counter = 1;

          // Sum up the totals data and add it to the data that gets passed
          data[0].duration += totalData.duration;
          data[0].frames += totalData.frames;
          data[0].fps = data[0].frames / data[0].duration;

          // Reset the totalData object
          totalData.duration = 0;
          totalData.frames = 0;

          // Return true to let the onComplete event continue propagation
          return true;
        }
      });

      // To stop the pulsation, set the _counter to the repeat value
      var oldstop = this.stop;
      this.stop = function(finish) {
        this._counter = this.repeat;
        oldstop.call(this, finish);
      }
    }
  };


  proto.setAttribute = function(attr, val, unit) {
    if (this.forceRound) val = Math.round(val);
    if (this.patterns.borderWidth.test(attr)) {
      unit = unit || 'px';
      superclass.setAttribute.call(this, 'borderTopWidth', val, unit);
      superclass.setAttribute.call(this, 'borderRightWidth', val, unit);
      superclass.setAttribute.call(this, 'borderBottomWidth', val, unit);
      superclass.setAttribute.call(this, 'borderLeftWidth', val, unit);
    }
    else {
      superclass.setAttribute.call(this, attr, val, unit);
    }
  };

  proto.getAttribute = function(attr) {
    var val;
    if (this.patterns.borderWidth.test(attr)) {
      val = superclass.getAttribute.call(this, 'borderTopWidth');
    }
    else {
      val = superclass.getAttribute.call(this, attr);
    }

    return val;
  };

  proto.doMethod = function(attr, start, end) {
    var val = null;

    if (!this.repeat) {
      val = superclass.doMethod.call(this, attr, start, end);
      return val;
    }

    var _totalFrames = this.totalFrames,
        _currentFrame = this.currentFrame;
    this.totalFrames /= 2;

    if ( (this.currentFrame / _totalFrames) < .5) {
      val = superclass.doMethod.call(this, attr, start, end);
    }
    else {
      this.currentFrame -= this.totalFrames;
      val = superclass.doMethod.call(this, attr, end, start);
    }
    this.currentFrame = _currentFrame;
    this.totalFrames = _totalFrames;

    return val;
  };

  Y.Pulsate = Pulsate;

}());
