/**
* bug 16307 Summary - Parents reset their secret word from sub login pop-over
*
* It is necessary to explain how bug 16307 is implemented as new codes are
* buried among older code. This will be useful for code review to find a better
* way to implement this feature.
*
* When sub-account is selected, we add the targetId to the "Forgot secret word"
* link so the correct behavior is followed when the link is clicked.
*
* Please note that the message saying "reset secret word is successful..." is
* already inserted in the DOM by jsp.  This is implemented this way to be
* consistent with error messages for entering secret word.
*
* If user click on "Forgot Secret Word" link, the sub-login pop-over renders
* instruction for parent, saying they can reset the secret word by clicking
* "Request secret word" green button.
*
* If secret word is reset and sent, then infoDialog closes.
* If an error occurs, infoDialog persists, showing an error message.
*
* To display proper error or success message, following occurs:
*
* Upon infoDialog.submitEvent, we assume resetting secret word will be successful:
* 1. hide non-relevant error message
* 2. show 'reset secret word success' msg
*
* For scenario that secret word failed to reset, or email failed to be sent,
* we want to hide the 'reset secret word success' message.  So, unpon
* infoDialog.submitEvent, we add 'hideSuccessMsgOfResetSecretWord' functionality
* to infoDialog.cancelEvent.
*
*/
//requires[util]: Intl

(function() {

  var util = YAHOO.util,
      widget = YAHOO.widget,
      Cookie = util.Cookie,
      Dom = util.Dom,
      Event = util.Event,
      KeyListener = util.KeyListener,
      YConnect = util.Connect,
      FlowDialog = widget.FlowDialog,
      Tooltip = widget.Tooltip,
      IXLTopic = YAHOO.ixl.topic,
      UA = YAHOO.env.ua,
      ixlLocalizedText = PROD_YUI.IXL.Intl.getModule("util-StaticResources");


  /***************************************************************************
   *                           Setup the IXL topics                          *
   ***************************************************************************/

  /*
   * checkLoginStatus - default action is to reload the window
   * loadSubLogin     - load the login dialog using the switch user link
   * showLoginDialog  - load the login dialog using the hidden login link
   * loadWelcomeTrial - show the trial welcome dialog (create a roster message)
   */

  IXLTopic.subscribe("checkLoginStatus", function() {
    window.location.assign(window.location.pathname);
  });

  var ppcImageLoad = function(ppcImages) {
    var i = 0,
        len = ppcImages ? ppcImages.length : 0,
        image;

    for ( ; i < len; i++) {
      image = new Image(1,1);
      image.src = ppcImages[i].url;
    }
  };

  var loginSuccess = function(oResponse) {
    IXLTopic.fireEvent("checkLoginStatus", oResponse.redirectUrl);
  };

  // Start with the creation of the loginDialog since it is used frequently.
  var loginDialog = new FlowDialog("loginDialog", {
    links: ["loginLink", "loginLinkJoin", "switchUserLink", "loginnow", "warningSwitchUserLk"],
    response_type: "json",
    width: 500,
    postmethod: "manual"
  });
  loginDialog.setHeader(ixlLocalizedText.getText("account.login_dialog.header"));

  PROD_YUI.IXL.loginDialog.setOldLoginDialog(loginDialog);

  loginDialog.setupButtons = function() {
    // Setup the buttons for the login dialog.  This allows us to disable the
    // buttons and handle enter properly on the form.
    var buttons = [];
    Dom.getElementsByClassName("crisp-button", "button", this.body,
        function(el) {
          var btnId = el.id;

          if ("continueSubmit" === btnId) {
            // hide the popover
            Event.addListener(el, "click", function(ev) {
                this.cancel();
              }, this, this);

            // don't add this to the list of buttons to disable when submitting
            return;
          }
          else if ("becomeMember" === btnId) {
            Event.addListener(el, "disabledChange", function(ev) {
              if (ev.newValue) {
                this.addStateCSSClasses("disabled");
                Dom.setAttribute(this._button, "disabled", "disabled");
              }
              else {
                this.removeStateCSSClasses("disabled");
                Dom.removeAttribute(this._button, "disabled");
              }
            });
          }
          buttons.push(el);
        }, this, true);
    this.cfg.resetProperty("buttons");
    this._aButtons = buttons;

    // Case 98942: Make "Try 10 questions free" link act as cancel button
    // in the mini sign-in popover of practice page.
    Event.addListener("sign-in-non-member-cancel-dialog-lk", "click", function(ev) {
      ev.preventDefault();
      this.cancel();
    }, this, true);
  };

  // signal that we've hidden this so that we can focus on the question
  loginDialog.cancelEvent.subscribe(function() {
    IXLTopic.fireEvent("hideLogin");
  });

  var origSuccess = loginDialog.callback.success;

  loginDialog.callback.success = function(o) {
    var oResponse = JSON.parse(o.responseText);

    if (oResponse.jspSource === "subaccountLogin" ||
        oResponse.jspSource === "upsellSignin")
    {
      loginDialog.complete();
      PROD_YUI.IXL.loginDialog.openLoginDialog(oResponse);
    }
    else if (oResponse.jspSource === "miniSignin") {
      loginDialog.complete();
      PROD_YUI.IXL.loginDialog.openLoginDialog(oResponse, false, loginDialog.callback.underLearningTab);
    }
    else if (oResponse.complete) {
      loginSuccess(oResponse);
      return;
    }
    else {
      origSuccess(o);
    }
  };

  // Case 69398: for AB Test, we want to know if login dialog is invoked from practice helper,
  // if it is, add a css classname 'is-from-practice' to the DIV#loginDialog
  loginDialog.showEvent.subscribe(function(ev) {

    var nLoginDialog = Dom.get('loginDialog'),
        sIsFromPracticeCssCls = 'is-from-practice';

    // Depending on the number of characters in name of the sub accounts, we apply appropriate
    // font-size to display the name.  For FF and Safari, we need to apply letter-spacing:-1px.
    if (YAHOO.env && YAHOO.env.ua) {
      if (!YAHOO.env.ua.mobile) {
        Dom.addClass(nLoginDialog, 'not-mobile');
      }
      if (YAHOO.env.ua.gecko > 0) {
        Dom.addClass(nLoginDialog, 'is-firefox');
      }
      if (YAHOO.env.ua.webkit > 0 && YAHOO.env.ua.chrome === 0) {
        Dom.addClass(nLoginDialog, 'is-safari');
      }
    }

    if (nLoginDialog) {
      if (loginDialog.callback.isFromPracticeHelper) {
        if (!Dom.hasClass(nLoginDialog, sIsFromPracticeCssCls)) {
          Dom.addClass(nLoginDialog, sIsFromPracticeCssCls);
        }
        try {
          if (window._loginFromPracticeRendered) {
            window._loginFromPracticeRendered();
          }
        }
        catch (e) {
          // error e
        }
      }
      else {
        Dom.removeClass(nLoginDialog, sIsFromPracticeCssCls);
      }
    }
  });
  /***************************************************************************
   *                           Setup the IXL topics                          *
   ***************************************************************************/
  // Show the login dialog
  var loadLoginDialog = function(
      linkId,
      isFromPracticeHelper,
      isMiniLoginDialog,
      isRenewalNotSignedIn,
      isPromoRenewalNotSignedIn,
      upsellSignIn)
    {

    return function() {
      var link = Dom.get(linkId) || Dom.get("hiddenlogin");
      if (link) {
        // Check for query param arguments passed to the event handler
        var first = true;
        var uri = link.href;

        // Remove the protocol so that this works in http and https
        uri = uri.replace(/https?:\/\/[^\/]+/, "");

        if (arguments && arguments[0]) {
          // if jsp name is available append jsp argument
          uri += "?jsp" + "=" + arguments[0]["jsp"];
          first = false;
        }

        var queryString = window.location.search;

        // regex match anything after udef and before the start of another query parameter
        // udef[0] is the matched text "udef={udefValue}"
        // udef[1] is the string with "={udefValue}"
        // udef[2] is the substring with "{udefValue}"
        var udef = queryString.match("[?&]udef(=([^&#]*)|&|#|$)");

        if (udef) {

          // decode udef into username
          var username = window.atob(udef[2]);
          uri += (first ? "?" : "&") + "udef" + "=" + encodeURIComponent(username);
          first = false;
        }

        // Case 69398: for AB test, we want to know if login dialog is invoked from practice helper
        if (isFromPracticeHelper) {
          loginDialog.callback.isFromPracticeHelper = true;
        }
        else {
          loginDialog.callback.isFromPracticeHelper = false;
        }

        if(isMiniLoginDialog) {
          uri += (first ? "?" : "&") + "showMiniSignin=true";
          first = false;
        }

        if (isRenewalNotSignedIn || isPromoRenewalNotSignedIn) {
          uri += (first ? "?" : "&") + "jsp=renewal";
          uri += "&parentRedirect=" + (isPromoRenewalNotSignedIn ? "RENEW_WITH_PROMO" : "RENEW");
          first = false;
        }

        if (upsellSignIn) {
          uri += (first ? "?" : "&") + "jsp=upsell";
          first = false;
        }

        // load the popover
        YConnect.asyncRequest('GET', uri, loginDialog.callback);
      }
    };
  };

  IXLTopic.subscribe("loadSubLogin", loadLoginDialog("switchUserLink", false, null));
  IXLTopic.subscribe("showLoginDialog", loadLoginDialog(null, false, null));
  IXLTopic.subscribe("showNonPracticeMiniLoginDialog", loadLoginDialog(null, false, true));
  IXLTopic.subscribe("isRenewalNotSignedIn", loadLoginDialog(null, false, false, true));
  IXLTopic.subscribe("isPromoRenewalNotSignedIn", loadLoginDialog(null, false, false, false, true));
  IXLTopic.subscribe("upsellSignIn", loadLoginDialog(null, false, false, false, false, true));

  /***************************************************************************
   *                  Setup topics for responsive popovers                   *
   ***************************************************************************/
  var loadPracticeDialog = function() {

    return function() {
      var link = Dom.get("hiddenlogin");
      if (link) {
        // Check for query param arguments passed to the event handler
        var first = true;
        var uri = link.href;

        // Remove the protocol so that this works in http and https
        uri = uri.replace(/https?:\/\/[^\/]+/, "");

        var queryString = window.location.search;

        // regex match anything after udef and before the start of another query parameter
        // udef[0] is the matched text "udef={udefValue}"
        // udef[1] is the string with "={udefValue}"
        // udef[2] is the substring with "{udefValue}"
        var udef = queryString.match("[?&]udef(=([^&#]*)|&|#|$)");

        if (udef) {
          // decode udef into username
          var username = window.atob(udef[2]);
          uri += (first ? "?" : "&") + "udef" + "=" + encodeURIComponent(username);
          first = false;
        }

        // Case 69398: for AB test, we want to know if login dialog is invoked from practice helper
        var isFromPracticeHelper = true;

        var underLearningTab = isUnderLearningTab();

        uri += (first ? "?" : "&") + "showMiniSignin=true";
        first = false;

        // load the popover
        YConnect.asyncRequest('GET', uri, {
          success: function(o) {
            var oResponse = JSON.parse(o.responseText);
            PROD_YUI.IXL.loginDialog.openLoginDialog(oResponse, isFromPracticeHelper, underLearningTab);
          }
        });
      }
    };
  };

  IXLTopic.subscribe("showPracticeLoginDialog", loadPracticeDialog());

  /***************************************************************************
   *        Utility methods for sign in page and quick login                 *
   ***************************************************************************/

  var createRememberTooltip = function(context) {
    var rememberTooltip = new Tooltip("rememberTooltip",
      {context: context,
       text: ixlLocalizedText.getText("login.remember")});
    return rememberTooltip;
  };

  // Change the context and the zindex of the remember tooltip, so it shows on the login dialog.
  var cfgTooltipContextZindex = function(rememberTooltip) {
    loginDialog.responseEvent.subscribe(function() {
      rememberTooltip.cfg.setProperty("context", "label-remember-signin-popover");
      var zindex = parseInt(this.cfg.getProperty("zindex"), 10) + 1;
      rememberTooltip.cfg.setProperty("zindex", zindex);
    });
    loginDialog.hideEvent.subscribe(function() {
      rememberTooltip.cfg.resetProperty("context");
      rememberTooltip.cfg.resetProperty("zindex");
    });
  };

  var disableForm = function(form) {
    for (var i = 0, fel = form.elements.length; i < fel; i++) {
      form.elements[i].disabled = true;
    }
  };

  var enableForm = function(form) {
    for (var i = 0, fel = form.elements.length; i < fel; i++) {
      form.elements[i].disabled = false;
    }
  };

  var formSubmitHandler = function() {
    YConnect.setForm(this.form, false);
    var c = YConnect.asyncRequest("POST", this.form.action, this.callback);
    this.asyncSubmitEvent.fire(c);
  };

  var resetInputTextFilelds = function (inputUserNameId, inputPasswordId) {
    var username = Dom.get(inputUserNameId);
    var password = Dom.get(inputPasswordId);

    if (username && password) {
      password.value = "";
      if (username.value !== "") {
        password.focus();
      }
      else {
        username.focus();
      }
    }
  };

  // Case PRODUCT-20436: If the login is in the "Learning" section of the navigation we
  //   want to make sure to close the popover when the user clicks the free questions link
  //   instead of redirecting to home page. Purposefully using vanilla to lean away from yui2
  var isUnderLearningTab = function () {
    var navCategories = document.getElementById("ixl-nav-categories");
    if (navCategories) {
        var pageGroup = navCategories.getAttribute("data-page-group");
        if (pageGroup && pageGroup === "learning") {
            return true;
        }
    }

    return false;
  };

  (function() {
    loginDialog.manualSubmitEvent.subscribe(formSubmitHandler);
  })();

  /***************************************************************************
   *                           Sign in page                                  *
   ***************************************************************************/

  (function() {
    var rememberTooltip;
    if (Dom.get("siusername")) {
      rememberTooltip = createRememberTooltip('siremember');
      cfgTooltipContextZindex(rememberTooltip);
    }

    var form = Dom.get("signin");

    loginDialog.cancelEvent.subscribe(function() {
      resetSignInPageErrorMessage();
      form.querySelector('#signin-button').disabled = false;
    });

    var hideSignInPageErrorMessage = function() {
      Dom.setStyle("signin-page-error", "visibility", "hidden");
    };

    var setSignInPageErrorMessage = function(errorMessage) {
      Dom.get('signin-page-error').innerHTML = errorMessage;
    };

    var resetSignInPageErrorMessage = function() {
      Dom.setStyle("signin-page-error", "visibility", "visible");
      Dom.get('signin-page-error').innerHTML = "";
    };

    Event.addListener(["signin"], "submit", function(ev) {
      Event.preventDefault(ev);

      var callback = {
        success: function(o){
          var response = JSON.parse(o.responseText);

          // Case 101022: Instead of opening popover, show error message directly on sign in page.
          if (response.signinPageError) {
            setSignInPageErrorMessage(response.errorMessage);
            resetInputTextFilelds("siusername", "sipassword");
            form.querySelector('#signin-button').disabled = false;
          }
          else {
            hideSignInPageErrorMessage();
            return loginDialog.callback.success(o);
          }
        },

        failure: function(o) {
          if (o.status === 400) {
            resetInputTextFilelds("siusername", "sipassword");
            form.querySelector('#signin-button').disabled = false;
            return;
          }
          FlowDialog.ajaxFailure(o);
        },

        argument: {dialog: loginDialog}
      };

      YConnect.setForm(form, false);
      YConnect.asyncRequest("POST", form.action, callback);
      form.querySelector('#signin-button').disabled = true;
    });

  })();


  /***************************************************************************
   *                         Quick login                                     *
   ***************************************************************************/

  (function() {
    var rememberTooltip;
    var underLearningTab = isUnderLearningTab();

    // Only set up these events if the quick login form exists
    if (Dom.get("qlusername")) {

      rememberTooltip = createRememberTooltip('remember');
      cfgTooltipContextZindex(rememberTooltip);
    }

    var form = Dom.get("quickLogin");

    loginDialog.cancelEvent.subscribe(function(){
      enableForm(form);
    });

    Event.addListener("quickLogin", "submit", function(ev) {
      Event.preventDefault(ev);

      // Case 69398: for AB Test, we want to know if login dialog is invoked from practice helper,
      loginDialog.callback.isFromPracticeHelper = false;
      loginDialog.callback.underLearningTab = underLearningTab;

      var callback = {
        // Use the loginDialog callback method for success since it will open
        // the dialog if we need to show the subaccount login flow.
        success: loginDialog.callback.success,

        failure: function(o) {
          enableForm(form);
          if (o.status === 400) {
            resetInputTextFilelds("qlusername", "qlpassword");
            return;
          }

          FlowDialog.ajaxFailure(o);
        },

        argument: {dialog: loginDialog}
      };

      // Change the form action for the quickLogin.  This let's google find the signin page
      var action = form.action;
      if (form.id === "quickLogin") {
        action = action.replace(/(\/signin)$/, "$1/ajax?showMiniSignin=true");
      }

      YConnect.setForm(form, false);
      YConnect.asyncRequest("POST", action, callback);
      disableForm(form);
    });

  })();

  // bug 53108, handle slow js loading for forms
  // preventDefault.js will stop forms marked with "data-delayed-form" from submitting,
  // and if it prevented a submission it will set the value to "submitted".
  //
  // Here we remove the attribute to stop this behavior (since now the necessary code is loaded),
  // and refire the submit event if it was recorded as being blocked.
  (function() {
    var forms = ['signin', 'quickLogin'];
    for (var i = 0; i < forms.length; i++) {
      var form = Dom.get(forms[i]);
      if (!form || form.getAttribute('data-delayed-form') === null) {
        continue;
      }

      var attrValue =  form.getAttribute('data-delayed-form');
      form.removeAttribute('data-delayed-form');

      if (attrValue === 'submitted') {
        var event = document.createEvent('Event');
        event.initEvent('submit', true, true);
        form.dispatchEvent(event);
      }
    }
  }());

  var disableButtonsIfSchoolList = function() {
    var schoolList = Dom.get("schoolId");
    if (schoolList) {
      Event.addListener(schoolList, "change", function(ev) {
        var target = Event.getTarget(ev);
        this.setButtonDisabled(target.value === "-1");
      }, this, true);
      this.setButtonDisabled(true);
    }
  };

  var associateNewUsernameInputs = function() {
    Event.addListener("akey_new_username", "focus", function() {
      try {
        Dom.get("akey_sugg_new").checked = true;
      } catch(e) {}
    });

    Event.addListener("akey_sugg_new", "click", function() {
      try {
        Dom.get("akey_new_username").focus();
      } catch(e){}
    });
  };

  var gotoRoster =  function() {
    window.location = "/roster/view";
  };

  /***************************************************************************
   *                        Welcome trial dialog                             *
   ***************************************************************************/
  // load the welcome to your trial popover
  IXLTopic.subscribe("loadWelcomeTrial", function () {
    var cookieName = "welcomeTrial",
        cookieValue = Cookie.get(cookieName);

    // If the welcomeTrial cookie exists, remove the old cookie and open
    // a popover with the welcome trial message.
    if (YAHOO.lang.isString(cookieValue)) {

      var dlg = new FlowDialog("welcomeTrialDialog", {
        width: "350px",
        response_type: "json"
      });

      // Disable the button to force the user to select a school.
      dlg.responseEvent.subscribe(disableButtonsIfSchoolList);
      dlg.responseEvent.subscribe(function() {
        if (this.cfg.getProperty("close")) {
          Cookie.remove(cookieName, {path:"/"});
        }
      });

      dlg.completeEvent.subscribe(function() {
        Cookie.remove(cookieName, {path:"/"});
        gotoRoster();
      });

      YConnect.asyncRequest('GET', "/roster/welcome", dlg.callback);
    }
  });

  /***************************************************************************
   *                    Select school start dialog                           *
   ***************************************************************************/
  // load the welcome to your trial popover
  IXLTopic.subscribe("loadSelectSchoolStart", function () {
    var cookieName = "selectSchoolStart",
        cookieValue = Cookie.get(cookieName);

    // If the welcomeTrial cookie exists, remove the old cookie and open
    // a popover with the welcome trial message.
    if (YAHOO.lang.isString(cookieValue)) {
      var SelectSchoolStartDialog = function(div) {
        SelectSchoolStartDialog.superclass.constructor.call(this, div);
      };

      var dlg = new FlowDialog("selectSchoolStartDialog", {
        width: "300px",
        visible: false, // don't show until calendar is rendered
        response_type: "json"
      });

      // bug 22957 - render the calendar before showing the dialog so
      // that it will be centered correctly.
      var locale = document.documentElement.lang || 'en-US';
      dlg.beforeShowEvent.subscribe(function() {
        var schoolYearStartDate = Dom.get("schoolYearStartDate"),
          initDate = PROD_YUI.IXL.DateTimeFormat.parseDateShort(schoolYearStartDate.value),
          year = initDate.getMonth() === 11
            ? (initDate.getFullYear() + 1) : initDate.getFullYear(),
          config = PROD_YUI.IXL.DateTimeFormat.getLocalizedYui2CalenderConfig(
            {
              LOCALE_WEEKDAYS: "short",
              mindate: new Date(year - 1, 11, 1, 0, 0, 0, 0),
              maxdate: new Date(year, 10, 30, 0, 0, 0, 0),
              pagedate: initDate,
              year: year
            },
            locale),
          cal = new YAHOO.widget.LimitDatesCalendar("schoolYearStartDateCal",
                                                    "schoolYearStartDateCal",
                                                    config);

         // bug 22956 - disable the submit (but not the cancel) button
         this._aButtons[0].disabled = true;
         cal.selectEvent.subscribe(
             function(type, args, obj) {
              var date = cal.toDate(args[0][0]);
              schoolYearStartDate.value =
                '' + (date.getMonth() + 1) + '/'
                + date.getDate() + '/'
                + date.getFullYear();
              this.setButtonDisabled(false);
            },
            cal,
            this);
          cal.render();
          cal.show();
          this.completeEvent.subscribe(function() {window.location.reload(true);});
        });
      Cookie.remove(cookieName, {path:"/"});

      YConnect.asyncRequest('GET',
                            "/admin/org/updateSchoolYearStart",
                            dlg.callback);
    }
  });


  /***************************************************************************
   *                    Daily practice limit dialog                          *
   ***************************************************************************/
  var setupSwitchSubaccountForPracticeLimit = function() {
    // if a family account reaches the practice limit,
    // new "switch account" links can appear in various places
    // including a new banner and practice limit dialog
    // so we need to add click listeners on those
    loginDialog.cfg.setProperty("links", ["warningSwitchUserLk"]);
  };

  var setupLimitDialog = function() {
    if (Dom.get("warningSwitchUserLk")) {
      // the practice limit dialog probably has a switch account link
      // so set up a listener for it
      setupSwitchSubaccountForPracticeLimit();
    }

    loginDialog.setupButtons();

    // Remove all the changes we made
    var resetLoginDialog = function() {
      this.cfg.resetProperty("help");
      this.cfg.resetProperty("width");
      this.setHeader("Sign In");

      // Unsubscribe from the event so this method doesn't get called again
      this.responseEvent.unsubscribe(handleResponseEvent);
      this.hideEvent.unsubscribe(resetLoginDialog);
    };

    var handleResponseEvent = function() {
      // If we got a response vs. a complete, we got a response. This usually
      // means there was an error in the login process. Either leave
      // errorMessage2 along, or show errorMessage.
      if (!Dom.get("errorMessage2")) {
        Dom.setStyle("errorMessage", "display", "block");
      }

      resetLoginDialog();
    };

    loginDialog.responseEvent.subscribe(handleResponseEvent);
    loginDialog.hideEvent.subscribe(resetLoginDialog);
  };

  IXLTopic.subscribe("showPracticeLimit", function (popover) {

    var loginDialogContainer = loginDialog.element,
        s20QuestionLimit = FlowDialog.DATA_ID_QUESTION_LIMIT_NOT_LOGGED_IN,
        aJoinActionBtn;

    if (popover.signedInStatus === "0") {
      PROD_YUI.IXL.loginDialog.openLoginDialog(Object.assign({}, popover));
      return;
    }

    if (Dom.get("warningSwitchUserLk")) {
      // a new banner with a switch account link was probably inserted into the DOM
      // so set up a listener for it
      setupSwitchSubaccountForPracticeLimit();
    }

    if (!loginDialog.rendered) {
      loginDialog.render(document.body);
    }

    loginDialog.applyJSONResponse(popover);
    setupLimitDialog();
    loginDialog.show();
    loginDialog.center();

    //If a user is practicing an unavailable subject in the edition, show a different version of
    // question limit popover.
    if(popover && parseInt(popover.signedInStatus, 10) ===  0 && popover.subjectUnavailable === "true")
    {
      s20QuestionLimit = FlowDialog.DATA_ID_QUESTION_LIMIT_NOT_LOGGED_IN_SUBJECT_UNAVAILABLE;
    }

    // Different version of 20 Question Limit popover for login or non-login user.
    // We need to give them different name.
    else if (popover && parseInt(popover.signedInStatus, 10) === 1) {
      s20QuestionLimit = FlowDialog.DATA_ID_QUESTION_LIMIT_LOGGED_IN;
    }

    // bug 69567 - A/B test different 20 Question Limit popover mockups.
    // Using CSS is ideal but there is no selector for different YUI 2 IXL flowdialog.
    //
    // To implmenet that, we have a patch here: adding a "data-dlg-id" attribute with unique
    // name when we render a specific flowdialog popover. In this case, it is for 20 questions
    // practice limit.  So, we add "data-dlg-id=QuesLimitNotLogIn" attribute to the dialog
    // element, which is the HTML node of the container.
    //
    // YUI2 does not support DOM.setAttribute when it comes to attribute with "data-" prefix.
    // So, we use the native one, which is safe nowadays.
    if (loginDialogContainer && loginDialogContainer.setAttribute) {
      loginDialogContainer.setAttribute(FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG, s20QuestionLimit);
    }


    /**
     * Bug 89114: For FF, when 20 Question Limit for Non-login Users appears,
     * it will try to focus on the entire popover and we see the dotted line.
     * We could not locate the actual element that is getting the focus. So,
     * we are going to ask it to focus on the green action button,
     * and style it without the outline.  This is beneficial as user can tab into
     * the username and password field.
     */
    aJoinActionBtn = Dom.getElementsByClassName('trial', 'a', Dom.get('dailylimit'));
    if (aJoinActionBtn && aJoinActionBtn.length > 0) {
      aJoinActionBtn[0].setAttribute('tabindex', 4);
      aJoinActionBtn[0].focus();
    }

    // Optimizely A/B test 20Q popover
    window.optimizely = window.optimizely || [];
    var question_limt = window.question_limit || 6264931568
    window.optimizely.push(["activate", question_limt]);
    window.optimizely.push(["trackEvent", '20Q_limit']);

    // Google analytics - track 20Q limit -- only track if analytics exists on the page
    var gaq = window['gaq'];
    if (gaq) {
      gaq('send', 'event', 'Student', '20Q_limit');
    }

    // Google Tag Manager 20Q limit
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({'event': '20Q_limit'});
  });


  /***************************************************************************
   *                           Activation key dialog                         *
   ***************************************************************************/
  var akeyDialog = (function() {
    var dlg = new FlowDialog("akeyDialog", {
      links: ["akeylink", "akeylink2", "akeylink3", "akeylink4"],
      response_type: "json"
    });

    var cleanReload = function() {
      window.location.assign(window.location.pathname);
    };

    dlg.responseEvent.subscribe(disableButtonsIfSchoolList);
    dlg.responseEvent.subscribe(associateNewUsernameInputs);

    dlg.completeEvent.subscribe(function() {
      var schoolEl = Dom.get("schoolId");
      if (schoolEl && Dom.isAncestor(this.element, schoolEl)) {
        gotoRoster();
      }
      else {
        cleanReload();
      }
    });
    // Reload the page the flow is complete and the last dialog was a confirmation
    dlg.beforeHideEvent.subscribe(function() {
      var hintEl = Dom.get("reloadHint");
      if (Dom.isAncestor(this.element, hintEl) && hintEl.value) {
        cleanReload();
      }
    });
    // Clear the old HTML when the dialog is hidden. This prevents the
    // reload hint from sticking around.
    dlg.hideEvent.subscribe(function() {
      this.setBody("");
    });

    // Load the activation link if requested
   IXLTopic.subscribe("loadActivationKey", function () {
     var akeylink = Dom.get('akeylink');
     if (akeylink) {
       YConnect.resetFormState();
       YConnect.asyncRequest('GET', akeylink.href, this.callback);
     }
   }, dlg, true);

    return dlg;
  })();

  /***************************************************************************
   *                        Roster Opt Out Dialog                            *
   ***************************************************************************/
  var rosterOptOutDialog = (function() {
    var dlg = new FlowDialog("rosterOptOutDialog", {
      links: ["rosterOptOut"],
      response_type: "json"
    });


    dlg.submitEvent.subscribe(function() {
      var oldCallback = dlg.callback.success;
      dlg.callback.success = function(o) {
        var banner = Dom.get('schoolYearSetupWarningBanner');
        banner.remove();
        dlg.complete();
      };
      dlg.callback.failure = function(o) {
        IXLTopic.fireEvent("checkLoginStatus");
      }
    });

    return dlg;
  })();

  /***************************************************************************
   *                     Request information key dialog                      *
   ***************************************************************************/
  var infoDialog = (function() {
    var dlg = new FlowDialog("infoDialog", {
      buttons: [FlowDialog.SUBMIT_BUTTON, FlowDialog.CANCEL_BUTTON],
      links: ["forgotLoginUser", "forgotLoginPass", "forgotPassLinkHelp",
              "forgotUsrLinkHelp"],
      response_type: "json",
      width: "500px",
      submit_on_enter: true
    });
    dlg.setHeader(ixlLocalizedText.getText("account.request_info_dialog.header"));

    dlg.beforeOpenDialogFromLink = function(href) {
      if (href.indexOf("/forgot/password") !== -1) {
        var username = Dom.get("username");
        if (!username) {
          username = Dom.get("qlusername") || Dom.get("siusername");
        }

        if (username && !isBlank(username.value)) {
          if (href.indexOf("?") !== -1) {
            href += "&username=" + username.value;
          }
          else {
            href += "?username=" + username.value;
          }
        }
      }

      return href;
    };

    // Change the buttons if it's not a form that can be submitted.
    dlg.responseEvent.subscribe(function() {
      this.cfg.setProperty("links", ["elink"]);
    });

    // bug 16307 - see bug 16307 summary listed above
    dlg.submitEvent.subscribe(function(){
      // hide error message of the secret word field for sub-login pop-over
      Dom.setStyle(["errorMessage", "errorMessage2"], "display", "none");
    });

    return dlg;
  })();


  /***************************************************************************
   *                           Login dialog                                  *
   ***************************************************************************/
  (function() {



    // Stop the arrow keys, tab key, and enter key when the subaccount choices
    // are shown
    var KEYS = KeyListener.KEY;
    var keylisten = new KeyListener(document,
      { keys:[KEYS.LEFT, KEYS.UP, KEYS.RIGHT, KEYS.DOWN, KEYS.TAB, KEYS.ENTER, 3] },
      { fn:function(type,o){Event.stopEvent(o[1]);}
      });

    var addRemoveErrorMessageClass = function(sId, bAdd) {

      var sClassname = 'has-err-msg';
      if (bAdd) {
        Dom.addClass(sId, sClassname);
      }
      else {
        Dom.removeClass(sId, sClassname);
      }
    };

    loginDialog.hideEvent.subscribe(keylisten.disable, keylisten, true);

    var setAriaAttrsForError = function(target, errorMessageId) {
      target.setAttribute("aria-invalid", true);
      target.setAttribute("aria-describedby", errorMessageId);
    };

    // Validate the login form
    loginDialog.validate = function() {

      var loginForm = Dom.get("loginForm") || Dom.get('subaccount');

      // if this is actually not the login form, just return
      if (!loginForm) {
        return true;
      }

      // If familyId has not been set, then we must be on the first login page
      if (!Dom.get("familyUserId")) {
        var usernameElement = Dom.get("username");
        var passwordElement = Dom.get("password");
        if (disallowBlank(usernameElement, "", true) ||
            disallowBlank(passwordElement, "", true)) {

          Dom.setStyle("errorMessage", "display", "block");
          Dom.setStyle("errorMessage2", "display", "none");
          if (disallowBlank(usernameElement, "", true)) {
            setAriaAttrsForError(usernameElement, "errorMessage");
          }
          if (disallowBlank(passwordElement, "", true)) {
            setAriaAttrsForError(passwordElement, "errorMessage");
          }
          return false;
        }
      }
      else { // on sub-account login.  need to check (only if password required)

        var radioLabels = Dom.getElementsByClassName(
            "label-subAccountRadio", "label", this.element);

        for (var i = 0; i < radioLabels.length; i++) {
          var item = radioLabels[i];
          if (Dom.getFirstChild(item).checked &&
              Dom.hasClass(item, "passRequired") &&
              disallowBlank(Dom.get("id-input-secret-word"), "", true)) {

            addRemoveErrorMessageClass('loginButtons', true);
            Dom.setStyle("errorMessage", "display", "block");
            Dom.setStyle("errorMessage2", "display", "none");
            return false;
          }
        }
      }

      return true;
    };

    loginDialog.responseEvent.subscribe(function() {

      this.setupButtons();

      // Change the link listeners for the info dialog
      infoDialog.cfg.setProperty("links", ["forgotPassLink", "forgotUsrLink"]);
      akeyDialog.cfg.setProperty("links", ["akeylink3"]);

      // Focus the username field
      if (Dom.get("username")) {
        try { Dom.get("username").focus(); } catch(e) {}
      }

    });


    loginDialog.hideEvent.subscribe(function() {
      // Reset the link listeners for the info dialog
      infoDialog.cfg.resetProperty("links");
      akeyDialog.cfg.resetProperty("links");

      // Reset the help link.
      this.cfg.resetProperty("help");
    });

  })();


  /***************************************************************************
   *           Activation key and request info dialog listeners              *
   ***************************************************************************/

  // If the info dialog was activated from the login popover, hide the login
  // dialog and add a listener to the info dialog that shows the login
  // dialog if the info dialog is canceled.
  var setupListeners = function(dlg, links, showLoginOnComplete) {
    var prevHelp = null;

    var cancelBackToLogin = function() {
      // Change the link listeners for the info dialog
      dlg.cfg.setProperty("links", links);

      if (prevHelp) {
        loginDialog.cfg.setProperty("help", prevHelp);
        prevHelp = null;
      }
      loginDialog.show(); // bug 18961
    },

    doShowLogin = function() {
      IXLTopic.fireEvent("showLoginDialog");
    },

    beforeShowHandler = function() {
      if (loginDialog.cfg.getProperty("visible")) {
        prevHelp = loginDialog.cfg.getProperty("help");
        loginDialog.hide();
        this.cancelEvent.subscribe(cancelBackToLogin);
        if (showLoginOnComplete) {
          this.completeEvent.subscribe(cancelBackToLogin);
        }
      }
      else if (showLoginOnComplete) {
        this.completeEvent.subscribe(doShowLogin);
      }
    },

    hideHandler = function() {
      this.cancelEvent.unsubscribe(cancelBackToLogin);
      this.completeEvent.unsubscribe(cancelBackToLogin);
      this.completeEvent.unsubscribe(doShowLogin);
      this.cfg.resetProperty("buttons");
      // Fix bug 13408 -ecurtis 6/5/08
      // Don't reset the links property if the login dialog is still visible
      if (!loginDialog.cfg.getProperty("visible")) {
        this.cfg.resetProperty("links");
      }
    };

    // If the info dialog was activated from the login popover, hide the login
    // dialog and add a listener to the info dialog that shows the login
    // dialog if the info dialog is canceled.
    dlg.beforeShowEvent.subscribe(beforeShowHandler);

    // Remove the cancel event listener.
    dlg.hideEvent.subscribe(hideHandler);

  };

  setupListeners(infoDialog, ["forgotPassLink", "forgotUsrLink", "forgotSecretWordLink"], true);
  setupListeners(akeyDialog, ["akeylink3"], false);

})();

//-----------------------------------------------------------------------------
// Function to handle the redirection after login for a specific user
//-----------------------------------------------------------------------------
function useSigninRedirect() {
  var IXLTopic = YAHOO.ixl.topic,
      sLoginStatus = "checkLoginStatus";

  var doRedirect = function(redirectUrl) {
    if (redirectUrl !== null) {
      window.location = redirectUrl;
    }
    else {
      window.location.reload();
    }
  };

  IXLTopic.unsubscribeAll(sLoginStatus);
  IXLTopic.subscribe(sLoginStatus, doRedirect);
}

/**
 * upsellSigninRedirect
 * upon sign in on Upsell page, redirect to account management page
 */
function upsellSigninRedirect(redirectUrl) {
  var IXLTopic = YAHOO.ixl.topic,
      sLoginStatus = "checkLoginStatus";

  var doRedirect = function() {
    window.location = redirectUrl;
  };

  IXLTopic.unsubscribeAll(sLoginStatus);
  IXLTopic.subscribe(sLoginStatus, doRedirect);
}

/**
 * upsellSignInAppendListener
 * upon sign in on Upsell page, redirect to corresponding link
 */
function  upsellSignInAppendListener(htmlClasses) {
  Array.prototype.forEach.call(htmlClasses, function(htmlClass){
    document.querySelector(htmlClass).addEventListener("click", function(e){
      e.preventDefault();
      YAHOO.ixl.topic.fireEvent("upsellSignIn");
      upsellSigninRedirect(e.target.href);
    });
  });
}
