/* Author: Sebastian Trueg <trueg@openlinksw.com>

*/

// all supported procedures
var s_procedures = null;

// the currently selected procedure
var s_currentProcedure = null;

// config setting. If true (set via config dlg)
var s_rememberValues = false;

// config setting: all remembered values
var s_rememberedValues = null;

/**
 * Shows a spinner in the main content area
 */
function showSpinner() {
    $("div#content").spinner({ position: 'center', hide: true });
}
function hideSpinner() {
    $("div#content").spinner("remove");
}

/**
 * Load the persistent local storage config
 * into the session and into the cfgDlg.
 */
function loadConfig() {
    // load session config
    s_rememberValues = (localStorage.rememberValues == "yes");

    // update cfg dialog
    $('input#cfgRememberValues').attr('checked', s_rememberValues ? "checked" : undefined);
}

/**
 * Saves the config from the current cfgDlg values
 * and writes them to the local storage.
 */
function saveConfig() {
    // update the session config
    s_rememberValues = ($('input#cfgRememberValues').attr('checked') == "checked");
    console.log("Saving remember values: " + s_rememberValues);

    // update the persistent config
    localStorage.rememberValues = s_rememberValues ? "yes" : null;
}

/**
 * Extracts the module name from a method name.
 * @return The module name or null if the method does not contain a module.
 */
function extractModule(name) {
    var i = name.indexOf(".");
    if(i > 0) {
        return name.substr(0, i);
    }
    else {
        return null;
    }
}

/**
 * Extract the module names from all method names and add them as options
 * into the module selection combobox.
 */
function loadMethodModules() {
    // get the list of modules by extracting prefixes from all methods
    var modules = [];
    $.each(s_procedures, function() {
        var prefix = extractModule(this.name);
        if(prefix != null && modules.indexOf(prefix) == -1) {
            modules.push(prefix);
        }
    });
    modules.sort();

    // populate the modules combobox
    var comboBox = $('#apiModuleSelector');
    $.each(modules, function() {
        comboBox.append('<option>' + this + '</option>');
    });
}

/**
 * Load the methods into the combobox taking the currently selected module into account.
 */
function loadMethods() {
    var comboBox = $('#apiMethodSelector');

    // get the module prefix from the module combobox
    var modPrefix = $('#apiModuleSelector').val();
    if(modPrefix == "all") {
        modPrefix = "";
    }

    // reset list
    comboBox.html('<option name="none">Please select a method</option>');

    // populate list
    var usedProcs = [];
    $.each(s_procedures, function() {
        if(this.name.substr(0, modPrefix.length) == modPrefix) {
            usedProcs.push(this.name);
        }
    });
    usedProcs.sort();
    for(i in usedProcs) {
        comboBox.append('<option>' + usedProcs[i] + '</option>');
    }
}

/**
 * Loads a method into the selection boxes and into the form.
 */
function loadMethod(methodName, ignorePrevValues) {
    console.log("loadMethod(" + methodName + ")");

    if(!methodName) {
        return;
    }

    // split module
    var mod = extractModule(methodName);
    if(mod == null) {
        mod = "all";
    }

    // load the data into the comboboxes
    $('#apiModuleSelector').val(mod);
    loadMethods();
    $('#apiMethodSelector').val(methodName);
    loadMethodForm(methodName, ignorePrevValues);
}

/**
 * Adds an additional input field to a parameter for multiple value input.
 */
function addParameterInputField(name) {
    // get the add button to insert before
    var $this = $('.parameter[id="' + name + '"]').parent().children().last();

    // detemine the number of inputs we already have
    var cnt = $this.parent().children().length-1;

    // append an index to the name
    name += "[" + cnt + "]";

    // add a new input between the button and the last input
    $this.before('<input style="margin-top:5px;" class="parameter input-xxlarge" id="' + name + '" type="text" /> ');

    // update the query URL whenever a parameter changes (for the new input)
    $this.prev().change(updateQueryUrlDisplay);
    $this.prev().change(updatePermaLink);
}

/**
 * Loads the form which contains fields for all method parameters.
 */
function loadMethodForm(methodName, ignorePrevValues) {
    console.log("loadMethodForm(" + methodName + ")");
    s_currentProcedure = s_procedures[methodName];

    // clear previous forms
    var paramForm = $('#params');
    paramForm.html('');

    // create a form field for each parameter
    $.each(s_currentProcedure.param, function() {
        var s = '<div class="control-group">';
        s += '<label class="control-label" for="' + this + '">' + this + ':</label>';
        s += '<div class="controls"><input class="parameter input-xxlarge" id="' + this + '" type="text" /> <a class="parameter_append" title="Add additional values for ' + this + '" href="#"><i class="icon-plus"></i></a></div>';
        s += "</div>";
        paramForm.append(s);
    });

    if(ignorePrevValues != true && s_rememberValues && s_rememberedValues) {
        if(s_rememberedValues.hasOwnProperty(s_currentProcedure.name)) {
            $.each(s_rememberedValues[s_currentProcedure.name], function(key, value) {
                // previously we stored values as strings, now we use a list of strings
                if(typeof(value) === 'string') {
                    paramForm.find("input#" + key).val(value);
                }

                // Each value is a list of strings
                else {
                    for(var i = 0; i < value.length; i++) {
                        // if we have more than one value for a parameter we need to append input fields
                        if(i > 0) addParameterInputField(key);
                        // find the last input for the parameter
                        paramForm.find("input#" + key).parent().children('input.parameter').last().val(value[i]);
                    }
                }
            });
        }
    }

    // show the parameters div
    $('#apiParamsDiv').show();

    // hide the results in case they are still there from a previous run
    $('#resultDiv').hide();

    // update the query URL whenever a parameter changes
    $('.parameter').change(updateQueryUrlDisplay);
    $('.parameter').change(updatePermaLink);

    // append more values for a parameter
    $('.parameter_append').click(function(event) {
      event.preventDefault();

      var $this = $(this);

      // detemine the id of the parameter
      var name = $this.parent().children().first().attr('id');

      // append the input
      addParameterInputField(name);
    });

    // update the query URL display
    updateQueryUrlDisplay();
    updatePermaLink();
}


/**
 * Format the result. Try to be smart about the formatting.
 */
function formatResult(result) {
    // we try to detect XML and JSon.
    try {
        var parsed = JSON.parse(result);
        if(parsed) {
            // format JSON
            return vkbeautify.json(result);
        }
    } catch(err) {}

    // try XML
    try {
        parsed = $.parseXML(result);
        if(parsed) {
            // format the XML
            return vkbeautify.xml(result);
        }
    } catch(err) {}

    // fallback
    return result;
}

/**
 * Returns a dict with members "url" and "params"
 */
function createQueryUrl() {
    // create params
    var params = {},
        authTab = '',
        queryUrl = '',
        webIdAuth = false;

    // 1. authentication
    if($('input#needAuth').attr("checked")) {
        authTab = $('div#authenticationTabContent').find('div.tab-pane.active').attr('id');
        if( authTab == 'authenticationTabHash') {
            // hash authentication
            if(document.pwdHashAuthForm.usr.value.length > 0) {
                params.user_name = document.pwdHashAuthForm.usr.value;
                params.password_hash = $.sha1(document.pwdHashAuthForm.usr.value + document.pwdHashAuthForm.pwd.value);
            }
        }
        else if( authTab == 'authenticationTabSid' ) {
            // session id authentication
            params.sid = document.sessionIdAuthForm.sessionId.value;
            params.realm = "wa";
        }
        else {
            webIdAuth = true;
        }
    }

    // 2. the actual params
    $('form#paramsForm').find('input.parameter').each(function() {
        var val = this.value;

        // extract name by stripping away the [N] suffix used for multiple occurences of the same parameter
        var name = this.id;
        if(name.indexOf('[') > 0)
          name = name.substring(0, this.id.indexOf('['));

        if(val != null && val.length > 0) {
            if(params[name])
                params[name].push(val);
            else
                params[name] = [].concat(val);
        }
    });

    // create the query URL
    queryUrl = ODS.createOdsApiUrl(s_currentProcedure.name, webIdAuth);

    return { "url": queryUrl, "params": params };
}

/**
 * Updates the query URL shown to the user for informational purposes
 */
function updateQueryUrlDisplay() {
    var queryUrl = createQueryUrl();
    $("#queryUrl").html(queryUrl.url + '?' + $.param(queryUrl.params));
}

/**
 * Executes the ODS method and saves the result into the result div.
 */
function executeMethod() {
    var queryUrl = createQueryUrl();

    // perform the query
    showSpinner();
    $.get(queryUrl.url, queryUrl.params, function(result) {
        hideSpinner();
        $('#resultDiv').show();
        $('#resultFancy').text(formatResult(result));
        $('#resultRaw').text(result);
        $(document.body).animate({'scrollTop': $('#resultDiv').offset().top }, 1000);
    }, 'text').error(function(result) {
      console.log(result);
        hideSpinner();
        var msg = "Call failed! [" + result.statusText + "] " + result.responseText;
        $('#resultDiv').show();
        $('#resultRaw').text(msg);
        $('#resultFancy').text(msg);
        $(document.body).animate({'scrollTop': $('#resultDiv').offset().top }, 1000);
    });

    // remember used values
    if(s_rememberValues) {
        // we do not want to store the authentication information
        delete queryUrl.params.user_name;
        delete queryUrl.params.password_hash;
        delete queryUrl.params.sid;
        delete queryUrl.params.realm;

        // store the last used values for all methods
        s_rememberedValues = s_rememberedValues || {};
        s_rememberedValues[s_currentProcedure.name] = queryUrl.params;

        // (localStorage does not support objects)
        localStorage.odsValues = JSON.stringify(s_rememberedValues);

        updateQueryUrlDisplay();
    }
}

/**
 * Creates a permalink for the currently selected method and parameter values, excluding authentication.
 */
function createPermaLink() {
  // url without hash or query
  var url = window.location.href.split("?")[0].split("#")[0];

  // add the selected method if there is any
  var $apiMethodSelector = $('#apiMethodSelector');
  if($apiMethodSelector.val() != 'none') {
    url += '#?method=';
    url += encodeURIComponent($apiMethodSelector.val());

    // add the parameter values
    $('form#paramsForm').find('input.parameter').each(function() {
        var val = this.value;

        // extract name by stripping away the [N] suffix used for multiple occurences of the same parameter
        var name = this.id;
        if(name.indexOf('[') > 0)
          name = name.substring(0, this.id.indexOf('['));

        if(val != null && val.length > 0) {
          url += '&' + name + '=' + encodeURIComponent(val);
        }
    });
  }

  return url;
}

/**
 * Updates the permalink on the corresponding a element.
 */
function updatePermaLink() {
  $('#buttonPermaLink').attr('href', createPermaLink());
}

/**
 * Register methods to actions, events, and so on.
 */
$(document).ready(function() {
    console.log("Ready");

    // Use traditional multi-value parameters in jQuery ajax calls, ie. do not include the []
    jQuery.ajaxSettings.traditional = true;

    loadConfig();

    // optionally load the last used values for all methods
    if(s_rememberValues && typeof localStorage.odsValues == "string") {
        s_rememberedValues = JSON.parse(localStorage.odsValues);
    }

    // load the methods and modules
    $.getJSON("ods-functions.vsp", function(data) {
        // "data" is a parsed JSON stream of procedures
        s_procedures = data;

        loadMethodModules();
        loadMethods();

        // if the URL contains a method to select we do that
        var method = $.address.parameter("method");
        if(method) {
            // load the requested method
            loadMethod(method, true);

            // load authentication values (usr,pwd,sid)
            var sid = $.address.parameter("sid");
            if(sid) {
                $('#authenticationTab a:eq(1)').tab('show');
                $('#sessionId').val(sid);
            }
            else {
                $('#authenticationTab a:eq(0)').tab('show');
                var usr = $.address.parameter("usr"),
                    pwd = $.address.parameter("pwd");
                if(usr) {
                    $('#usr').val(usr);
                    $('#pwd').val(pwd);
                }
            }

            // load the requested parameters
            var paramForm = $('#params');
            $.each($.address.parameterNames(), function() {
                paramForm.find("input#" + this).val(decodeURIComponent($.address.parameter(this)));
            });

            updateQueryUrlDisplay();
            updatePermaLink();
        }
    });

    // load the method form on selection change
    $('#apiModuleSelector').change(function() {
        loadMethods();
     });
    $('#apiMethodSelector').change(function() {
       loadMethodForm($(this).val());
    });

    // execute the method on button click
    $('input#executeButton').click(function(event) {
        event.preventDefault();
        executeMethod();
    });
    // execute the method on pressing enter
    $('div#params').find('input').keydown(function(e) {
        // save on ENTER
        if(e.keyCode == 13) {
            // do not submit the form
            e.preventDefault();
            executeMethod();
        }
    });

    // setup the config dialog
    $('div#cfgDlg').find('input').keydown(function(e) {
        // save on ENTER
        if(e.keyCode == 13) {
            // do not submit the form
            e.preventDefault();
            saveConfig();
            $('#cfgDlg').modal('hide');
        }
    });
    $('a#cfgSave').click(function(e) {
        e.preventDefault();

        // save the config
        saveConfig();

        // hide the cfg dialog
        $('#cfgDlg').modal('hide');
    });

    // hide/show the authentication panel based on the checkbox
    $('input#needAuth').change(function() {
        if($(this).attr("checked")) {
            $('div#authenticationDiv').show();
        }
        else {
            $('div#authenticationDiv').hide();
        }
    });

    // select the user.authenticate method when the user clicks it in the session id tab
    $('#selectMethodAuthenticate').click(function(e) {
       e.preventDefault();
       console.log("selecting user.authenticate");
       $('#authenticationTab a:first').tab('show');
       loadMethod("user.authenticate");
    });

    // update the query URL whenever the authentication settings change
    $('.auth').change(updateQueryUrlDisplay);
    $('#authenticationTab a[data-toggle=tab]').on("shown", updateQueryUrlDisplay);
});
