jQuery(function () {
    'use strict';
    /* globals JSINFO */

    /** counter for copied multi templates */
    var copycount = 0;

    /**
     * Simplyfies AJAX requests for types
     *
     * @param {string} column A configured column in the form schema.name
     * @param {function} fn Callback on success
     * @param {object} data Additional data to pass
     */
    function struct_ajax(column, fn, data) {
        if (!data) data = {};

        data['call'] = 'plugin_struct';
        data['column'] = column;
        data['id'] = JSINFO.id;
        data['ns'] = JSINFO.namespace;

        jQuery.post(DOKU_BASE + 'lib/exe/ajax.php', data, fn, 'json')
            .fail(function (result) {
                if(result.responseJSON) {
                    if (result.responseJSON.stacktrace) {
                        console.error(result.responseJSON.error + "\n" + result.responseJSON.stacktrace);
                    }
                    alert(result.responseJSON.error);
                } else {
                    // some fatal error occured, get a text only version of the response
                    alert(jQuery(result.responseText).text());
                }
            });
    }

    /**
     * @param {string} val
     * @return {Array}
     */
    function split(val) {
        return val.split(/,\s*/);
    }

    /**
     * @param {string} term
     * @returns {string}
     */
    function extractLast(term) {
        return split(term).pop();
    }


    /**
     * Replace numbered placeholders in a string with the given arguments
     *
     * Example formatString('{0} is dead, but {1} is alive! {0} {2}', 'ASP', 'ASP.NET');
     *
     * adapted from http://stackoverflow.com/a/4673436/3293343
     * @param format
     * @returns {*}
     */
    function formatString(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
            ;
        });
    }


    /**
     * hints
     */
    jQuery('.struct .hashint').tooltip();

    /**
     * Attach datepicker to date types
     */
    jQuery('input.struct_date').datepicker({
        dateFormat: 'yy-mm-dd'
    });

    /**
     * Attach image dialog to image types
     */
    jQuery('button.struct_media').click(function () {
        var input_id = jQuery(this).siblings('input').attr('id');
        window.open(
            DOKU_BASE + 'lib/exe/mediamanager.php' +
            '?ns=' + encodeURIComponent(JSINFO['namespace']) +
            '&edid=' + encodeURIComponent(input_id) +
            '&onselect=insertStructMedia',
            'mediaselect',
            'width=750,height=500,left=20,top=20,scrollbars=yes,resizable=yes'); //
    });

    /**
     * Custom onSelect handler for struct img button
     */
    window.insertStructMedia = function (edid, mediaid, opts, align) {
        jQuery('#' + edid).val(mediaid).change();
    };

    /**
     * Autocomplete for single type
     */
    jQuery('input.struct_autocomplete').autocomplete({
        ismulti: false,
        source: function (request, cb) {
            var name = jQuery(this.element[0]).closest('label').data('column');
            var term = request.term;
            if (this.options.ismulti) {
                term = extractLast(term);
            }
            struct_ajax(name, cb, {search: term});
        }
    });

    /**
     * Autocomplete for multi type
     */
    jQuery('.multiwrap input.struct_autocomplete').autocomplete('option', {
        ismulti: true,
        focus: function () {
            // prevent value inserted on focus
            return false;
        },
        select: function (event, ui) {
            var terms = split(this.value);
            // remove the current input
            terms.pop();
            // add the selected item
            terms.push(ui.item.value);
            // add placeholder to get the comma-and-space at the end
            terms.push("");
            this.value = terms.join(", ");
            return false;
        }
    });

    /**
     * Handle tabs in the Schema Editor
     */
    jQuery('#plugin__struct_json, #plugin__struct_delete').hide();
    jQuery('#plugin__struct_tabs').find('a').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var $me = jQuery(this);
        if($me.parent().hasClass('active')) return; // nothing to do

        $me.parent().parent().find('li').removeClass('active');
        $me.parent().addClass('active');
        jQuery('#plugin__struct_json, #plugin__struct_editor, #plugin__struct_delete').hide();
        jQuery($me.attr('href')).show();
    });


    /**
     * Toggle the disabled class in the schema editor
     */
    jQuery('#plugin__struct_editor').find('td.isenabled input').change(function () {
        var $checkbox = jQuery(this);
        $checkbox.parents('tr').toggleClass('disabled', !$checkbox.prop('checked'));
    });

    var $dokuform = jQuery('#dw__editform');

    /**
     * Duplicate the elements in .newtemplate whenever any input in it changes
     */
    $dokuform.find('.struct .newtemplate').each(function () {
        var $tplwrapper = jQuery(this);
        var $tpl = $tplwrapper.children().clone(true, true);

        $tplwrapper.on('change', 'input,textarea,select', function () {
            if (jQuery(this).val() == '') return;

            // prepare a new template and make sure all the IDs in it are unique
            var $copy = $tpl.clone(true, true);
            copycount++;
            $copy.find('*[id]').each(function () {
                this.id = this.id + '_' + copycount;
            });

            // append the template
            $tplwrapper.append($copy);
        });
    });

    /**
     * Toggle fieldsets in edit form and remeber in cookie
     */
    $dokuform.find('.struct fieldset legend').each(function () {
        var $legend = jQuery(this);
        var $fset = $legend.parent();

        // reinit saved state from cookie
        if (DokuCookie.getValue($fset.data('schema'))) {
            $fset.toggleClass('closed');
        }

        // attach click handler

        $legend.click(function () {
            $fset.toggleClass('closed');
            // remember setting in preference cookie
            if ($fset.hasClass('closed')) {
                DokuCookie.setValue($fset.data('schema'), 1);
            } else {
                DokuCookie.setValue($fset.data('schema'), '');
            }
        });
    });

    jQuery('a.deleteSchema').click(function (event) {
        var schema = jQuery(this).closest('tr').find('td:nth-child(2)').text();
        var page = jQuery(this).closest('tr').find('td:nth-child(1)').text();
        if(!window.confirm(formatString(LANG.plugins.struct['confirmAssignmentsDelete'], schema, page))) {
            event.preventDefault();
            event.stopPropagation();
        }
    })

});