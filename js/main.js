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
    ODS.setOdsHost(localStorage.odsHost);
    s_rememberValues = (localStorage.rememberValues == "yes");

    // update cfg dialog
    $('input#cfgHost').val(ODS.getOdsHost());
    $('input#cfgRememberValues').attr('checked', s_rememberValues ? "checked" : undefined);
}

/**
 * Saves the config from the current cfgDlg values
 * and writes them to the local storage.
 */
function saveConfig() {
    // update the session config
    console.log("Saving host " + $('input#cfgHost').val());
    ODS.setOdsHost($('input#cfgHost').val());
    s_rememberValues = ($('input#cfgRememberValues').attr('checked') == "checked");
    console.log("Saving remember values: " + s_rememberValues);

    // update the persistent config
    localStorage.odsHost = ODS.getOdsHost();
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
    $.each(s_procedures, function() {
        if(this.name.substr(0, modPrefix.length) == modPrefix) {
            comboBox.append('<option>' + this.name + '</option>');
        }
    });
}

/**
 * Loads a method into the selection boxes and into the form.
 */
function loadMethod(methodName) {
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
    loadMethodForm(methodName);
}

/**
 * Loads the form which contains fields for all method parameters.
 */
function loadMethodForm(methodName) {
    console.log("loadMethodForm(" + methodName + ")");
    s_currentProcedure = s_procedures[methodName];

    // clear previous forms
    var paramForm = $('#params');
    paramForm.html('');

    // create a form field for each parameter
    $.each(s_currentProcedure.param, function() {
        var s = '<div class="control-group">';
        s += '<label class="control-label" for="' + this + '">' + this + ':</label>';
        s += '<div class="controls"><input class="parameter input-xxlarge" id="' + this + '" type="text" /></div>';
        s += "</div>";
        paramForm.append(s);
    });

    if(s_rememberValues && s_rememberedValues) {
        if(s_rememberedValues.hasOwnProperty(s_currentProcedure.name)) {
            $.each(s_rememberedValues[s_currentProcedure.name], function(key, value) {
                paramForm.find("input#" + key).val(value);
            });
        }
    }

    // show the parameters div
    $('#apiParamsDiv').show();

    // hide the results in case they are still there from a previous run
    $('#resultDiv').hide();
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
    parsed = $.parseXML(result);
    if(parsed) {
        // format the XML
        return vkbeautify.xml(result);
    }

    // fallback
    return result;
}

/**
 * Executes the ODS method and saves the result into the result div.
 */
function executeMethod() {
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
            params.user_name = document.pwdHashAuthForm.usr.value;
            params.password_hash = $.sha1(document.pwdHashAuthForm.usr.value + document.pwdHashAuthForm.pwd.value);
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
        if(val != null && val.length > 0) {
            params[this.id] = val;
        }
    });

    // create the query URL
    queryUrl = ODS.createOdsApiUrl(s_currentProcedure.name, webIdAuth);

    // perform the query
    showSpinner();
    $.get(queryUrl, params, function(result) {
        hideSpinner();
        $('#resultDiv').show();
        $('#resultFancy').text(formatResult(result));
        $('#resultRaw').text(result);
    }, 'text');

    // remember used values
    if(s_rememberValues) {
        // we do not want to store the authentication information
        delete params.user_name;
        delete params.password_hash;

        // store the last used values for all methods
        s_rememberedValues = s_rememberedValues || {};
        s_rememberedValues[s_currentProcedure.name] = {};
        $.each(params, function(key, value) {
            s_rememberedValues[s_currentProcedure.name][key] = value;
        });

        // (localStorage does not support objects)
        localStorage.odsValues = JSON.stringify(s_rememberedValues);
    }
}

/**
 * Register methods to actions, events, and so on.
 */
$(document).ready(function() {
    console.log("Ready");

    loadConfig();

    // optionally load the last used values for all methods
    if(s_rememberValues && typeof localStorage.odsValues == "string") {
        s_rememberedValues = JSON.parse(localStorage.odsValues);
    }

    // load the methods and modules
    $.get("ods-functions", function(data) {
        // "data" is a JSON stream of procedures
        s_procedures = $.parseJSON(data);

        loadMethodModules();
        loadMethods();

        // if the URL contains a method to select we do that
        var method = $.address.parameter("method");
        if(method) {
            // load the requested method
            loadMethod(method);

            // load the requested parameters
            var paramForm = $('#params');
            $.each($.address.parameterNames(), function() {
                if(this != "method") {
                    paramForm.find("input#" + this).val($.address.parameter(this));
                }
            });
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
});
