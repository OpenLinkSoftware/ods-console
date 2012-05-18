/* Author: Sebastian Trueg <trueg@openlinksw.com>

*/

// all supported procedures
var s_procedures = null;

// the currently selected procedure
var s_currentProcedure = null;

/**
 * Load the persistent local storage config
 * into the session and into the cfgDlg.
 */
function loadConfig() {
    ODS.setOdsHost(localStorage.odsHost);
    $('input#cfgHost').val(ODS.getOdsHost());
}

/**
 * Saves the config from the current cfgDlg values
 * and writes them to the local storage.
 */
function saveConfig() {
    // update the session config
    console.log("Saving host " + $('input#cfgHost').val());
    ODS.setOdsHost($('input#cfgHost').val());

    // update the persistent config
    localStorage.odsHost = ODS.getOdsHost();
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
        s += '<div class="controls"><input class="parameter" id="' + this + '" type="text" /></div>';
        s += "</div>";
        paramForm.append(s);
    });
    
    // show the parameters div
    $('#apiParamsDiv').show();
}

/**
 * Executes the ODS method and saves the result into the result div.
 */
function executeMethod() {
    // create params
    // 1. authentication
    var params = {
        user_name : document.pwdHashAuthForm.usr.value,
        password_hash : $.sha1(document.pwdHashAuthForm.usr.value + document.pwdHashAuthForm.pwd.value)
    };

    // 2. the actual params
    $('form#paramsForm').find('input.parameter').each(function() {
        var val = this.value;
        if(val != null && val.length > 0) {
            params[this.id] = val;
        }
    });

    // create the query URL
    var queryUrl = ODS.createOdsApiUrl(s_currentProcedure.name);

    // perform the query
    $.get(queryUrl, params, function(result) {
        $('#resultDiv').show();
        console.log(result);
        $('#result').text(result);
    }, 'text');
}

/**
 * Register methods to actions, events, and so on.
 */
$(document).ready(function() {
    console.log("Ready");

    loadConfig();

    var comboBox = $('#apiMethodSelector');

    // load the methods
    $.get("ods-functions", function(data) {
        // "data" is a JSON stream of procedures
        s_procedures = $.parseJSON(data); 

        $.each(s_procedures, function() {
            comboBox.append('<option>' + this.name + '</option>'); 
        });
    });

    // load the method form on selection change
    comboBox.change(function() {
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
});
