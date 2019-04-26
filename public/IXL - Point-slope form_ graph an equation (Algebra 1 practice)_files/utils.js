// Fix issue with cookies not having the domain set correctly.
(function() {
  var Lang = YAHOO.lang,
      Cookie = YAHOO.util.Cookie;
  if (Cookie) {
    var createCookieString = Cookie._createCookieString;

    var hostRegex = /[a-z]+\.(ixl\.[a-z])/;

    // Override createCookieString to set the domain always.
    Cookie._createCookieString = function (name /*:String*/, value /*:Variant*/, encodeValue /*:Boolean*/, options /*:Object*/) /*:String*/ {

      if (!Lang.isObject(options)) {
        options = {};
      }

      if (!Lang.isString(options.domain) || options.domain === "") {
        var hostname = window.location.hostname;
        options.domain = hostname.replace(hostRegex, "$1");
      }

      return createCookieString.call(this, name, value, encodeValue, options);
    };
  }

})();

var escapeHTML = (function() {
  var gt=/>/g,
      lt=/</g,
      amp=/&/g;
  return function(text) {
    return text.replace(amp, "&#38;").replace(lt, "&#60;").replace(gt, "&#62;");
  };
}());

function olderBrowserTest() {

  var Cookie = YAHOO.util.Cookie,
      ua = YAHOO.env.ua,
      olderBrowser = "ob"; // The cookie name for the older browser test.

  // YUI2 would fail to detect IE 11/Edge, so we want to make sure by double checking.
  // Following numberify function and MSIE regex is copied form YUI3.
  // Ideally we replace YAHOO.env.ua with Y.UA (YUI3) in the future.
  var m = {},
      sUserAgent = window.navigator ? window.navigator.userAgent : '',
      numberify = function(s) {
        var c = 0;
        return parseFloat(s.replace(/\./g, function() {
          return (c++ === 1) ? '' : '.';
        }));
      };
  if (ua.ie === 0) {
    m = sUserAgent.match(/MSIE ([^;]*)|Trident.*; rv:([0-9.]+)/);
    if (m && (m[1] || m[2])) {
      ua.ie = numberify(m[1] || m[2]);
    }
  }

  if (Cookie && Cookie.get(olderBrowser) === null) {

    // NOTE: if this test changes, UserAgentUtils.isOlderBrowser should be updated as well.
    if ( (ua.ie && ua.ie < 10) ||
         (ua.gecko && ua.gecko < 10.0) ||
         (ua.webkit && ua.webkit < 534) ||
         (ua.opera && ua.opera < 9)
        )
    {
      Cookie.set(olderBrowser, window.location.pathname, {
        path: "/"
      });

      window.location = "/olderbrowser";
    }
  }
}

// Helper function used by addLoadEvent to ensure the canvas items are inited
function initCanvasTags(func) {

  var doInit = (function() {
    var findName = function(fString, startOfQGen) {
      return fString.substring(startOfQGen + "draw".length, fString.indexOf("()"));
    };

    var canvasInit = function() {
      if (window['G_vmlCanvasManager'] && !this['getContext']) {
        G_vmlCanvasManager.initElement(this);
      }
    };

    var Dom = YAHOO.util.Dom,
        Event = YAHOO.util.Event,
        UA = YAHOO.env.ua;

    if (UA.ie && UA.ie < 9) {
      return function(fString, startOfQGen) {
        var cName = findName(fString, startOfQGen);

        if (Event.DOMReady && Dom.get(cName)) {
          canvasInit.call(Dom.get(cName));
        }
        else {
          Event.onContentReady(cName, canvasInit);
        }

        return cName;
      };
    }
    else {
      return findName;
    }
  }());

  var fString = func.toString(),
      startOfQGen = fString.indexOf("drawqgencanvas");
  if (startOfQGen != -1) {
    return doInit(fString, startOfQGen);
  }
  return null;
}

// Function used by canvas tags to draw themselves
function addLoadEvent(func) {
  var cName = initCanvasTags(func);
  if (cName !== null && !YAHOO.util.Event.DOMReady) {
    YAHOO.util.Event.onContentReady([cName], func);
  }
  else {
    func();
  }
}

window.loadContentAndExecuteScripts = (function() {

  var util = YAHOO.util,
      CustomEvent = util.CustomEvent,
      Dom = util.Dom,
      Event = util.Event;

  // Taken from jquery-1.4.2
  var globalEval = (function() {

    var rnotwhite = /\S/,
        supportScriptEval = false;

    var root = document.documentElement,
        script = document.createElement("script"),
        id = "script" + (new Date).getTime();

    script.type = "text/javascript";
    try {
      script.appendChild( document.createTextNode( "window." + id + "=1;" ) );
    } catch(e) {}

    root.insertBefore( script, root.firstChild );

    // Make sure that the execution of code works by injecting a script
    // tag with appendChild/createTextNode
    // (IE doesn't support this, fails, and uses .text instead)
    if ( window[ id ] ) {
      supportScriptEval = true;
      delete window[ id ];
    }

    return function(data) {
      if ( data && rnotwhite.test(data) ) {
        // Inspired by code by Andrea Giammarchi
        // http://webreflection.blogspot.com/2007/08/global-scope-evaluation-and-dom.html
        var head = document.getElementsByTagName("head")[0] || document.documentElement,
          script = document.createElement("script");

        script.type = "text/javascript";

        if ( supportScriptEval ) {
          script.appendChild( document.createTextNode( data ) );
        } else {
          script.text = data;
        }

        // Use insertBefore instead of appendChild to circumvent an IE6 bug.
        // This arises when a base node is used (#2709).
        head.insertBefore( script, head.firstChild );
        head.removeChild( script );
      }
    };

  }());

  // Loop over all the scripts and run each one
  var runAllScripts = function(scripts) {
    var i = 0,
        n = (scripts ? scripts.length : 0);
    for ( ; i < n; i++) {
      globalEval(scripts[i]);
    }
  };

  var finishLoadingContents = function(o, fromTimeout) {
    // If the object says it's already loaded it's contents, just move on.
    if (o.isComplete) {
      return;
    }

    var oDiv = o.oDiv,
        oScratch = o.oScratch;

    var bdDiv = oScratch;
    if (!bdDiv || fromTimeout) {
      bdDiv = oDiv;
    }
    bdDiv.innerHTML = o.bodyText;

    if (oScratch) {
      var child = Dom.getFirstChild(oDiv);
      if (child) {
        oDiv.replaceChild(Dom.getFirstChild(oScratch), child);
      }
      else {
        oDiv.appendChild(Dom.getFirstChild(oScratch));
      }
    }

    o.isComplete = true;

    // evaluate the embedded javascripts in the order they were added
    runAllScripts(o.embeddedScripts);

    if (o['onComplete']) {
      var scope = o.scope ? o.scope : this;
      o.onComplete.call(scope);
    }

  };

  var preLoadBodyTextImages = (function() {
    var imgTagRegEx = /<img src=("|')(.*?)\1( |>|\/>)/g,
        imgSrcRegEx = /<\s*img [^\>]*src\s*=\s*[\""\']?([^\""\'\s>]*)/i;

    var getImgSrc = function(text) {
      var aMatch = text.match(imgSrcRegEx);
      return (aMatch ? aMatch[1] : null);
    };

    var findImages = function(text) {
      var images = {},
          matches = text.match(imgTagRegEx),
          i = 0,
          n = (matches ? matches.length : 0),
          imgSrc;
      for ( ; i < n; i++) {
        imgSrc = getImgSrc(matches[i]);
        images[imgSrc] = new Image();
        images[imgSrc].src = imgSrc;
      }
      return images;
    };

    var setupCheckLoadedEvent = (function() {
      var fakeTimeoutImgName = "timeout";

      var handleLoadEvent = function(whichImg, o) {
        var nl = o.nl,
            i = 0,
            n = nl.length;
        for ( ; i < n; i++) {
          if (nl[i].complete || nl[i].src === whichImg) {
            nl.splice(i, 1);
          }
        }
        if (nl.length == 0 || whichImg === fakeTimeoutImgName) {
          o.fn(o.obj);
          this.unsubscribeAll();
          clearTimeout(o.timeout)
        }
      };

      return function(o) {
        var clEvent = new CustomEvent("checkLoadedEvent", this, false, CustomEvent.FLAT);
        o.timeout = setTimeout(function() { clEvent.fire(fakeTimeoutImgName); }, 1000);
        clEvent.subscribe(handleLoadEvent, o, clEvent);
        return clEvent;
      };
    }());

    var setupImgOnLoad = function(img, e) {
      var mySrc = img.src;
      img.onload = function() {
        e.fire(mySrc);
      };
    };

    return function(text, func, obj) {
      var images = findImages(text),
          nl = [],
          clEvent = setupCheckLoadedEvent({
            nl: nl,
            fn: func,
            obj: obj
          });

      for (var tempImgSrc in images) {
        var tempImg = images[tempImgSrc];
        if (!tempImg.complete) {
          nl.push(tempImg);
          setupImgOnLoad(tempImg, clEvent);
        }
      }
      clEvent.fire(null);
    };
  }());

  var stripScriptTags = (function() {

    var openTag = "<script",
        closeTag = "</script>",
        closeTagLen = closeTag.length,
        whBugFixRegEx = /\b(width|height) = ([0-9.]+)\b/g;

    return function(text, embeddedScripts) {
      var scriptStart = text.indexOf(openTag),
          end,
          scriptBodyStart,
          scriptBody;

      while (scriptStart !== -1) {
        scriptBodyStart = text.indexOf(">", scriptStart) + 1;
        end = text.indexOf(closeTag, scriptStart) + closeTagLen;

        // now remove the script body
        scriptBody = text.substring(scriptBodyStart, end - closeTagLen);

        // Fix bug with style.width or style.height not specifying px
        scriptBody = scriptBody.replace(whBugFixRegEx, "$1 = '$2px'");

        if (scriptBody.length > 0) {
          embeddedScripts.push(scriptBody);
        }
        //remove script
        text = text.substring(0, scriptStart) + text.substring(end, text.length);

        // Find the next script tag
        scriptStart = text.indexOf(openTag);
      }

      return text;
    };

  }());

  return function(rawContent, oDiv, oCallback, oScratch) {
    var scopedObject = {
      embeddedScripts: [],
      oDiv: oDiv,
      onComplete: oCallback.success,
      scope: oCallback.scope,
      oScratch: oScratch,
      isComplete: false
    };

    var text = stripScriptTags(rawContent, scopedObject.embeddedScripts);
    scopedObject.bodyText = text;

    if (text.indexOf("<img") !== -1) {
      preLoadBodyTextImages(text, finishLoadingContents, scopedObject);

      // Set a timeout to force finishing the loading of the contents.
      YAHOO.lang.later(3000, this, finishLoadingContents, [scopedObject, true], false);
    }
    else {
      finishLoadingContents(scopedObject);
    }

  };

}());


// ---------------------------------------------------------------------
// Global custom events are handled through YAHOO.ixl.topic.
// Only create the event provider if it hasn't been created yet.
// ---------------------------------------------------------------------
(function() {
  if (! (YAHOO.ixl && YAHOO.ixl.topic) ) {
    var IXLTopic = function() { };
    YAHOO.lang.extend(IXLTopic, YAHOO.util.EventProvider, {
      subscribe: function(type) {
        if (!this.hasEvent(type)) {
          this.createEvent(type);
        }
        return IXLTopic.superclass.subscribe.apply(this, arguments);
      }
    });
    YAHOO.ixl = YAHOO.namespace("ixl");
    YAHOO.ixl.topic = new IXLTopic();
  }
}());

// ---------------------------------------------------------------------
// Helper function to open the help links in a new popup window
// ---------------------------------------------------------------------
var openHelpTopic = (function() {
  var win;
  return function(link, wname) {
    wname = wname || "help_body";
    win = window.open(link.href,wname,"height=600,width=700,status=yes,toolbar=yes,scrollbars=yes,resizable=yes,menubar=no,location=no");
    win.focus();
  }
}());

function getLocationHash() {
  var i, href;
  href = window.location.href;
  i = href.indexOf("#");
  return i >= 0 ? href.substr(i + 1) : null;
}

/**
 * extractReplaceQuery - find, return, replace value of a specific variable
 * in a query string
 *
 * @input
 *
 * - targetStr: the variable of which you want to find or replace the value.
 * - objOrStr: string or DOM object with 'href' attribute (ex. link or location)
 * - newValue: if false, return target variable value, else replace with newValue
 *
 * @return
 * - value of variable spcificed by targetStr or updated string of objOrStr
 * - if objOrStr.href exists, it will be updated with newValue, if newValue !false
 *
 * @note
 * If a question mark is present, '?', query string starts after '?'.
 *
 * @usage
 * testObj.herf =  'http://www.yahoo.com?doc=1234&rand=2233'
 * Query string would be 'doc=1234&rand=2233'
 *
 * extractReplaceQuery('doc', testObj, '8888')
 * will change testObj.href to 'http://www.yahoo.com?doc=8888&rand=2233'
 * will return new testObj.href string
 *
 * extractReplaceQuery('doc', 'doc=1234&rand=2233', false)
 * will return '1234'
 *
 **/
function extractReplaceQuery(targetStr, objOrStr, newValue){

  // validate input
  if (targetStr === '' || targetStr === null || objOrStr === 'number'
    || objOrStr === null || objOrStr === 'function' || objOrStr === 'boolean'
    || typeof newValue === 'object' || typeof newValue === 'function'){
    return false;
  }

  var fullStr = '', workingStr = '';

  // prepare input, take whole string or string after first '?'
  if (typeof objOrStr === 'object'){
    fullStr = objOrStr.href;
  }
  else {
    fullStr = objOrStr;
  }

  var questionDel = '?';
  var firstDel = '&';
  var secondDel = '=';
  var newStr = '';

  // separate the string by '?'
  var dataArr = fullStr.split(questionDel);
  workingStr = dataArr[0];
  if (dataArr.length > 1){
    // has '?', taking first string after '?'
    workingStr = dataArr[1];
    newStr = dataArr[0] + questionDel;
  } // if dataArr.length > 1

  if (workingStr.length === 0){
    // there is nothing to work on, return original string
    return fullStr;
  }

  // take the working string, the portion we are interested in,
  // look for '&" as delimiter
  var indexValueArr = workingStr.split(firstDel);
  for (var i=0; i<indexValueArr.length; i++){
    if (i>0){
      // looping second time, add a delimiter
      newStr = newStr + firstDel;
    } // if i>0

    // for each nameValue pair, split them by '=' to get name and value
    var nameValue = indexValueArr[i].split(secondDel);
    newStr = newStr + nameValue[0];
    if (nameValue.length > 1){
      // name value pair has value available
      if (nameValue[0] === targetStr){
        // if we are interested in this name value pair
        if (newValue){
          // newValue has value, add it to new string
          newStr = newStr + secondDel + newValue;
        }
        else {
          // newValue is false, return the value only
          return nameValue[1];
        }
      }
      else {
        newStr = newStr + secondDel + nameValue[1];
      } // if nameValue[0] === targetStr
    } // if nameValue.length > 1
  } // for

  if (dataArr.length > 2){
    // there are more than one '?', this function will only process first
    // query string, so we attach the string after second '?' back
    for (var j=2; j<dataArr.length; j++){
      newStr = newStr + questionDel + dataArr[j];
    }
  } // if dataArr.length > 2
  if (typeof objOrStr === 'object' && objOrStr.href !== ''){
    objOrStr.href = newStr;
  }
  return newStr;
}


/**
 * id: the id of the element to update when clicking, this element
 * must also have a value attribute which is the starting value
 *
 * updateURL: the url to send a post to when updating
 *
 * postData: any extra data to send to updateURL - will send this and
 * the id / new value of the element being updated
 *
 * required: true if the new value must be non-empty (will not update
 * if empty)
 *
 * errorFn: function to call when updateURL returns with failure,
 * takes the element being updated as an argument
 *
 * this function will take an element identified by id and will create
 * a text input when the element is clicked with the current value of
 * the element. upon losing focus, will send a POST request to
 * updateURL with postData and the id/value of the text field. on
 * success, will set the elements innerHTML to the new value and upon
 * failure will leave the text field and call errorFn with the element
 * as an argument
 */
function updateOnClick(id, updateURL, postData, required, errorFn, successFn, sInputType) {
  // elem is the element being updated and value is the current
  // validated value
  var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event,
      KeyListener = YAHOO.util.KeyListener,
      Connect = YAHOO.util.Connect,
      elem = Dom.get(id),
      value;

  // default input type "text"
  sInputType = sInputType || 'text';

  if (elem === null ) {
    return;
  }

  if (!isBlank(postData)) {
    postData = postData + "&";
  }
  else {
    postData = '';
  }

  var resetElement = function(val, clickFn){
    var div = document.createElement('div');
    value = val;
    // truncate if necessary
    if (value) {
      div.innerHTML = truncate(value, 34);
    }
    else {
      div.innerHTML = "<span class=click-to-add>Click to add</span>";
    }

    elem.innerHTML = '';
    Dom.addClass(div, "hide");
    elem.appendChild(div);

    Event.addListener(elem, "click", clickFn);
  };

  var editElement = function() {
    // create an input field with the current value
    var oTemp = document.createElement("div");
    oTemp.innerHTML = "<input type='" + sInputType + "' />";
    var input = Dom.getFirstChild(oTemp);

    var saveFn = function(e) {
          // if required and cleared out, reset to the original value
          if (required && isBlank(input.value)) {
            resetElement(value, editElement);
          }
          else {
            Event.removeListener(input, "focusout");
            if (input.keyListener) {
              input.keyListener.disable();
            }
            input.disabled = true;
            Connect.asyncRequest(
              "POST",
              updateURL,
              {
                success : function(o) {
                  var input = o.argument.input,
                    resultJSON = JSON.parse(o.responseText),
                    result = resultJSON[id];
                  if (result) {
                    if (result.error) {
                      input.disabled = false;
                      if (errorFn) {
                        errorFn(input.parentNode, result.error);
                      }
                      Event.addListener(input, "focusout", saveFn);
                      if (input.keyListener) {
                        input.keyListener.enable();
                      }
                    }
                    else {
                      if (successFn) {
                        successFn(input.parentNode, result.value);
                      }
                      resetElement(result.value, editElement);
                    }
                  }
                },
                failure: function(o) {
                  window.location.reload(true); // bug 22029 - ikim 4/15/2010
                },
                argument:
                {
                  "input":input
                }
              },
              // use encodeURIComponent in order to be able to include
              // special characters as the value
              postData + id + "=" + encodeURIComponent(input.value));
          }
        };

    Event.removeListener(elem, "click");

    input.name = id;
    input.id = id + '_input';
    input.value = value;

    // fixing bug 21719 for ie6 and ie7, instead of removing the
    // div that shows the value, hide it - ikim 4/15/2010
    Dom.setStyle(elem.firstChild, 'display', 'none');
    elem.appendChild(input);

    input.keyListener = new KeyListener(
      input,
      {keys: [KeyListener.KEY.ENTER, 3]},
      {fn: function(type, o, arg) {arg.blur();},
       scope: input});
    input.keyListener.enable();
    input.focus();
    Event.addListener(input, "focusout", saveFn);
  };

  resetElement(Dom.getAttribute(elem, "value"), editElement);
}

// ---------------------------------------------------------------------
// Truncate a string to the given length
// ---------------------------------------------------------------------
function truncate(str, length, truncation) {
  length = length || 30;
  truncation = truncation === undefined ? '...' : truncation;
  return str.length > length ?
         str.slice(0, length - truncation.length) + truncation : str;
}

// ---------------------------------------------------------------------
// Number formatter
// ---------------------------------------------------------------------
/*
Author: Robert Hashemian
http://www.hashemian.com/

You can use this code in any manner so long as the author's
name, Web address and this disclaimer is kept intact.
********************************************************
Usage Sample:
FormatNumberBy3("1234512345.12345", ".", ",");
*/

// function to format a number with separators. returns formatted number.
// num - the number to be formatted
// decpoint - the decimal point character. if skipped, "." is used
// sep - the separator character. if skipped, "," is used
function FormatNumberBy3(num, decpoint, sep) {
  // No formatting necessary
  if (num < 1000 && arguments.length == 1) return num.toString();

  // check for missing parameters and use defaults if so
  if (arguments.length == 2) {
    sep = ",";
  }
  if (arguments.length == 1) {
    sep = ",";
    decpoint = ".";
  }
  // need a string for operations
  num = num.toString();
  // separate the whole number and the fraction if possible
  var a = num.split(decpoint);
  var x = a[0]; // decimal
  var y = a[1]; // fraction
  var z = "";
  var i;


  if (typeof(x) != "undefined") {
    // reverse the digits. regexp works from left to right.
    for (i=x.length-1;i>=0;i--) {
      z += x.charAt(i);
    }
    // add separators. but undo the trailing one, if there
    z = z.replace(/(\d{3})/g, "$1" + sep);
    if (z.slice(-sep.length) == sep) {
      z = z.slice(0, -sep.length);
    }
    x = "";
    // reverse again to get back the number
    for (i=z.length-1;i>=0;i--) {
      x += z.charAt(i);
    }
    // add the fraction back in, if it was there
    if (typeof(y) != "undefined" && y.length > 0) {
      x += decpoint + y;
    }
  }
  return x;
}


// Functions to test if a form has been modified
// ===================================================================
// Author: Matt Kruse <matt@mattkruse.com>
// WWW: http://www.mattkruse.com/
//
// NOTICE: You may use this code for any purpose, commercial or
// private, without any further permission from the author. You may
// remove this notice from your final code if you wish, however it is
// appreciated by the author if at least my website address is kept.
//
// You may *NOT* re-distribute this code in any way except through its
// use. That means, you can include it in your product, or your web
// site, or any other form where the code is actually being used. You
// may not put the plain javascript up on your site for download or
// include it in your javascript libraries for download.
// If you wish to share this code with others, please just point them
// to the URL instead.
// Please DO NOT link directly to my .js files from your site. Copy
// the files to your server and use them there. Thank you.
// ===================================================================
function LTrim(str){if(str==null){return null;}for(var i=0;str.charAt(i)==" ";i++);return str.substring(i,str.length);}
function RTrim(str){if(str==null){return null;}for(var i=str.length-1;str.charAt(i)==" ";i--);return str.substring(0,i+1);}
function Trim(str){return LTrim(RTrim(str));}
function LTrimAll(str){if(str==null){return str;}for(var i=0;str.charAt(i)==" " || str.charAt(i)=="\n" || str.charAt(i)=="\t";i++);return str.substring(i,str.length);}
function RTrimAll(str){if(str==null){return str;}for(var i=str.length-1;str.charAt(i)==" " || str.charAt(i)=="\n" || str.charAt(i)=="\t";i--);return str.substring(0,i+1);}
function TrimAll(str){return LTrimAll(RTrimAll(str));}
function isNull(val){return(val==null);}
function isBlank(val){if(val==null){return true;}for(var i=0;i<val.length;i++){if((val.charAt(i)!=' ')&&(val.charAt(i)!="\t")&&(val.charAt(i)!="\n")&&(val.charAt(i)!="\r")){return false;}}return true;}
function isInteger(val){if(isBlank(val)){return false;}for(var i=0;i<val.length;i++){if(!isDigit(val.charAt(i))){return false;}}return true;}
function isNumeric(val){return(parseFloat(val,10)==(val*1));}
function isArray(obj){return(typeof(obj.length)=="undefined")?false:true;}
function isDigit(num){if(num.length>1){return false;}var string="1234567890";if(string.indexOf(num)!=-1){return true;}return false;}
function setNullIfBlank(obj){if(isBlank(obj.value)){obj.value="";}}
function setFieldsToUpperCase(){for(var i=0;i<arguments.length;i++){arguments[i].value = arguments[i].value.toUpperCase();}}
function disallowBlank(obj){var msg=(arguments.length>1)?arguments[1]:"";var dofocus=(arguments.length>2)?arguments[2]:false;if(isBlank(getInputValue(obj))){if(!isBlank(msg)){alert(msg);}if(dofocus){if(isArray(obj) &&(typeof(obj.type)=="undefined")){obj=obj[0];}if(obj.type=="text"||obj.type=="textarea"||obj.type=="password"){obj.select();}obj.focus();}return true;}return false;}
function disallowModify(obj){var msg=(arguments.length>1)?arguments[1]:"";var dofocus=(arguments.length>2)?arguments[2]:false;if(getInputValue(obj)!=getInputDefaultValue(obj)){if(!isBlank(msg)){alert(msg);}if(dofocus){if(isArray(obj) &&(typeof(obj.type)=="undefined")){obj=obj[0];}if(obj.type=="text"||obj.type=="textarea"||obj.type=="password"){obj.select();}obj.focus();}setInputValue(obj,getInputDefaultValue(obj));return true;}return false;}
function commifyArray(obj,delimiter){if(typeof(delimiter)=="undefined" || delimiter==null){delimiter = ",";}var s="";if(obj==null||obj.length<=0){return s;}for(var i=0;i<obj.length;i++){s=s+((s=="")?"":delimiter)+obj[i].toString();}return s;}
function getSingleInputValue(obj,use_default,delimiter){switch(obj.type){case 'radio': case 'checkbox': return(((use_default)?obj.defaultChecked:obj.checked)?obj.value:null);case 'text': case 'hidden': case 'textarea': return(use_default)?obj.defaultValue:obj.value;case 'password': return((use_default)?null:obj.value);case 'select-one':
if(obj.options==null){return null;}if(use_default){var o=obj.options;for(var i=0;i<o.length;i++){if(o[i].defaultSelected){return o[i].value;}}return o[0].value;}if(obj.selectedIndex<0){return null;}return(obj.options.length>0)?obj.options[obj.selectedIndex].value:null;case 'select-multiple':
if(obj.options==null){return null;}var values=new Array();for(var i=0;i<obj.options.length;i++){if((use_default&&obj.options[i].defaultSelected)||(!use_default&&obj.options[i].selected)){values[values.length]=obj.options[i].value;}}return(values.length==0)?null:commifyArray(values,delimiter);}/*alert("FATAL ERROR: Field type "+obj.type+" is not supported for this function");*/return null;}
function getSingleInputText(obj,use_default,delimiter){switch(obj.type){case 'radio': case 'checkbox': 	return "";case 'text': case 'hidden': case 'textarea': return(use_default)?obj.defaultValue:obj.value;case 'password': return((use_default)?null:obj.value);case 'select-one':
if(obj.options==null){return null;}if(use_default){var o=obj.options;for(var i=0;i<o.length;i++){if(o[i].defaultSelected){return o[i].text;}}return o[0].text;}if(obj.selectedIndex<0){return null;}return(obj.options.length>0)?obj.options[obj.selectedIndex].text:null;case 'select-multiple':
if(obj.options==null){return null;}var values=new Array();for(var i=0;i<obj.options.length;i++){if((use_default&&obj.options[i].defaultSelected)||(!use_default&&obj.options[i].selected)){values[values.length]=obj.options[i].text;}}return(values.length==0)?null:commifyArray(values,delimiter);}/*alert("FATAL ERROR: Field type "+obj.type+" is not supported for this function");*/return null;}
function setSingleInputValue(obj,value){switch(obj.type){case 'radio': case 'checkbox': if(obj.value==value){obj.checked=true;return true;}else{obj.checked=false;return false;}case 'text': case 'hidden': case 'textarea': case 'password': obj.value=value;return true;case 'select-one': case 'select-multiple':
var o=obj.options;for(var i=0;i<o.length;i++){if(o[i].value==value){o[i].selected=true;}else{o[i].selected=false;}}return true;}/*alert("FATAL ERROR: Field type "+obj.type+" is not supported for this function");*/return false;}
function getInputValue(obj,delimiter){var use_default=(arguments.length>2)?arguments[2]:false;if(isArray(obj) &&(typeof(obj.type)=="undefined")){var values=new Array();for(var i=0;i<obj.length;i++){var v=getSingleInputValue(obj[i],use_default,delimiter);if(v!=null){values[values.length]=v;}}return commifyArray(values,delimiter);}return getSingleInputValue(obj,use_default,delimiter);}
function getInputText(obj,delimiter){var use_default=(arguments.length>2)?arguments[2]:false;if(isArray(obj) &&(typeof(obj.type)=="undefined")){var values=new Array();for(var i=0;i<obj.length;i++){var v=getSingleInputText(obj[i],use_default,delimiter);if(v!=null){values[values.length]=v;}}return commifyArray(values,delimiter);}return getSingleInputText(obj,use_default,delimiter);}
function getInputDefaultValue(obj,delimiter){return getInputValue(obj,delimiter,true);}
function isChanged(obj){return(getInputValue(obj)!=getInputDefaultValue(obj));}
function setInputValue(obj,value){var use_default=(arguments.length>1)?arguments[1]:false;if(isArray(obj)&&(typeof(obj.type)=="undefined")){for(var i=0;i<obj.length;i++){setSingleInputValue(obj[i],value);}}else{setSingleInputValue(obj,value);}}
function isFormModified(theform,hidden_fields,ignore_fields){if(hidden_fields==null){hidden_fields="";}if(ignore_fields==null){ignore_fields="";}var hiddenFields=new Object();var ignoreFields=new Object();var i,field;var hidden_fields_array=hidden_fields.split(',');for(i=0;i<hidden_fields_array.length;i++){hiddenFields[Trim(hidden_fields_array[i])]=true;}var ignore_fields_array=ignore_fields.split(',');for(i=0;i<ignore_fields_array.length;i++){ignoreFields[Trim(ignore_fields_array[i])]=true;}for(i=0;i<theform.elements.length;i++){var changed=false;var name=theform.elements[i].name;if(!isBlank(name)){var type=theform.elements[i].type;if(!ignoreFields[name]){if(type=="hidden"&&hiddenFields[name]){changed=isChanged(theform[name]);}else if(type=="hidden"){changed=false;}else{changed=isChanged(theform[name]);}}}if(changed){return true;}}return false;}

