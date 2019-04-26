YAHOO.util.Event.onDOMReady(function() {

  var FlowDialog = YAHOO.widget.FlowDialog,
      noaccessDialog = new FlowDialog("noaccess", {
        links: ["notifylink"],
        response_type: 'json',
        zindex: 30
      });

  YAHOO.ixl.topic.subscribe('showNoAccess', function(popover) {

    var dialogContainer = noaccessDialog.element,
        sPopoverId;

    // Bug 85437: applying 620px width here. JSON width attribute specified in corresponding
    // JSP is not modified so the alternative version of this popover (the one with submit
    // notification form) is not affected.
    // Bug 101475: we want changes made in 85437 only target Expired Trial User. Students will
    // continue to get different version, which has forms.
    if (popover.jspSource === 'noPracticeAccess' &&
        popover.expiredTrialUser === true &&
        popover.submitNotifyFormVisible === false) {
      // With _bPreventJspWidthOverride valued "true", JSON width setting will be removed.
      // It is necessary, because "applyJSONResponse" method override width setting applied below.
      noaccessDialog._bPreventJspWidthOverride = true;
      noaccessDialog.cfg.resetProperty("width");
      noaccessDialog.cfg.setProperty('width', '620px');

      sPopoverId = 'trial-expired-no-notify'; // per code review, make CSS classname local
    }
    else if (popover.jspSource === 'noPracticeAccess' &&
        popover.expiredTrialUser === false &&
        popover.submitNotifyFormVisible === false) {
      sPopoverId = 'subscription-expired-no-notify'; // per code review, make CSS classname local
    }
    else {
      sPopoverId = 'trial-expired-with-notify'; // per code review, make CSS classname local
    }

    if (!noaccessDialog.rendered) {
      noaccessDialog.render(document.body);
    }

    noaccessDialog.applyJSONResponse(popover);

    // Applying DATA_ATTR_FOR_ID_FLOWDIALOG attribute after "applyingJSONResponse" method is called.
    // Because upon hide or changeBody event, we reset DATA_ATTR_FOR_ID_FLOWDIALOG attribute.
    dialogContainer.setAttribute(FlowDialog.DATA_ATTR_FOR_ID_FLOWDIALOG, sPopoverId);

    noaccessDialog.show();
    noaccessDialog.responseEvent.fire();
  });
});
