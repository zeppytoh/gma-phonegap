/************************************************************************/
/**
 * Language tools for Mobile GMA.
 * Joshua Chan <joshua@appdevdesigns.net>
 *
 *  Dependencies:
 *    - jQuery
 *    - i18n/en.js
 *    - i18n/fr.js
 *    - i18n/zh-hans.js
 *    - i18n/...
 *    - Settings.js
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
        var translated = this.dictionary[original];
        return translated || original;
    },
    
    /*
     * Detect the user's configured language
     */
    detect: function () {
        var dfd = $.Deferred();
        var self = this;
        
        if (navigator.globalization) {
            navigator.globalization.getPreferredLanguage(
                function(lang) {
                    dfd.resolve(lang.value);
                },
                function() {
                    // Error. So fall back on default.
                    dfd.resolve(Settings.defaultLang);
                }
            );
        } else {
            // PhoneGap plugin not found. Assume browser testing environment
            // and use default.
            dfd.resolve(Settings.defaultLang);
        }
        
        return dfd;
    },
    
    /*
     * Initializes the dictionary by detecting the user preferred language,
     * and then loading the matching dictionary data.
     */
    init: function () {
        var dfd = $.Deferred();
        var self = this;
        
        self.detect()
        .then(function(lang){
            lang = String(lang).toLowerCase();
            self.fetchDictionary(lang)
            .then(function(data){
                self.dictionary = data;
                self.translate();
                dfd.resolve();
            });
        });
        
        return dfd;
    },
    
    
    /*
     * Download the dictionary data
     */
    fetchDictionary: function (lang, offlineMode) {
        var dfd = $.Deferred();
        var self = this;
        
        var dictionaryURL = 'i18n/' + lang + '.json';
        if (offlineMode) {
            console.log("Using offline dictionary");
        } else {
            // Fetch latest dictionary from the remote server
            dictionaryURL = Settings.dictionaryAuthority + dictionaryURL;
        }
        
        $.ajax({
            url: dictionaryURL,
            method: 'GET',
            dataType: 'json'
        })
        .then(function(data){
            dfd.resolve(data);
        })
        .fail(function(res, status, err){
            // Could not get dictionary from server. Fall back on the locally
            // packaged one.
            if (!offlineMode) {
                self.fetchDictionary(lang, true)
                .then(dfd.resolve)
                .fail(dfd.reject);
            }
            else {
                alert(
                    "Could not load dictionary\n" +
                    lang + '.json\n' +
                    (err.message || '')
                );
                dfd.reject();
            }
        });
        return dfd;
    },

    
    log: function (elem, original, translated) {
        if (Settings.debugMode) {
            console.log(
                elem.tagName +
                ": [" + original + "] \n" +
                "  ==> [" + translated + "]"
            );
        }
    },
    
    
    /*
     * Finds all text elements on the page and translates them into the
     * current language.
     */
    translate: function () {
        var self = this;
        
        $(document).ready(function(){
            $('label, button, h1, a, span, option, input[placeholder]')
            .each(function(){

                var $this = $(this);
                if ($this.children().length > 0) {
                    // Skip if this is not a leaf node.
                    return;
                }
                
                if ($this.attr('placeholder')) {
                    // Text used as textbox placeholder
                    var original = $this.attr('placeholder');
                    var translated = self.t(original);
                    if (translated && translated != original) {
                        $this.attr('placeholder', translated);
                    }
                } 

                else {
                    // Conventional text elements
                    var original = $this.text();
                    if (original == '') {
                        return;
                    }
                    var translated = self.t(original);
                    if (translated && translated != original) {
                        $this.html( translated );
                    }
                }
                
                self.log(this, original, translated);
            });
        });
    }
    
};
