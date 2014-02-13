/************************************************************************/
/**
 * Language tools for Mobile GMA.
 * Joshua Chan <joshua@appdevdesigns.net>
 *
 * UNDER CONSTRUCTION
 *
 *  Dependencies:
 *    - jQuery
 *    - i18n/en.js
 *    - i18n/fr.js
 *    - i18n/zh.js
 *    - i18n/...
 */

/**
 * @function t
 *
 * Translates a given string into the current language.
 *
 * @param string
 * @return string
 */
function t(original) {
    return Language.t(original);
}

Language = {

    dictionary: {},

    t: function (original) {
        if (this.dictionary[original]) {
            return this.dictionary[original];
        } else {
            console.log("No translation for: " + original);
            return original;
        }
    },
    
    init: function () {
        var dfd = $.Deferred();
        var self = this;

        navigator.globalization.getPreferredLanguage(
            function (locale) {
                $.ajax({
                    url: 'i18n/' + locale.value + '.json',
                    method: 'GET',
                    dataType: 'json'
                })
                .then(function(data){
                    self.dictionary = data;
                })
                .fail(function(res, status, err){
                    alert(err.message);
                    dfd.reject();
                });
            },
            function () {
                alert("Unable to detect language");
                dfd.reject();
            }
        );

        return dfd;
    }
    
};
