class Confection {

    constructor() {

        this.uuid = false;
        this.domain = window.location.hostname;
        this.privacy = 'none'; //Privacy setup. none|default|strict
        this.showBanner = true; //Set if should show banner automatically
        this.bannerPosition = 'none'; //Set where banner should appear right|left|center
        this.showedBanner = 0; //Set if banner was already showed 0|1|2
        this.persistent = true; //Will save/retrieve UUID from cookies
        this.consent = 0; //Check if user gave consent. 0|1|2
        this.later = { //Holds data until have permission to submit
            events : [],
            fields : [],
            cookies: []
        };
        this.forceBannerOpen = false;
        this.consentLost = false;
        this.ignoreFields = [];  //Holds field name which will be ignored
        this.analytics = true;

        this.wss = new WebSocket("wss://wss.confection.io");
        this.wssTimeout = false;

        /*
         * Translation Strings
         */
        this.i18n = {
            banner_none : 'This site isn’t collecting your personal information. Any information you submitted before opting out is still in our system. To manage this information, please ',
            banner_base : 'The authors of this site care about your personal data. That’s why they use Confection. Our privacy-first data management app helps people like you take control of the information you share online.',
            banner_strict_base : 'At the moment, this site would like permission to use basic data to improve the content it offers you. This would include information like your IP address. We won’t collect more sensitive information such as your name or email address without asking you first.',
            banner_strict : 'Hi, it’s Confection again. We noticed that you’re about to share information like your name and email with this site. Do we have your permission to do so?',
            banner_collecting : 'You’ve given this site permission to collect information like your IP address, name, and email.',
            banner_collecting_basic : 'Collecting Basic Data',
            banner_collecting_full : 'Fully Authorized',
            banner_collecting_not : 'Not Collecting Your Data',
            button_more : 'Learn More',
            button_accept : 'Accept',
            button_deny : 'Not now',
            button_stop : 'Stop Collecting',
            button_resume : 'Resume Data Sharing',
            button_close : 'Close',
            button_click : 'click here',
        }

        /*
         * Track form element changes
         */
        document.addEventListener('change', function (e) {
            confection.checkInput(e);
        });
    
        /*
         * Check if there is any iframe
         */
        this.checkIframedForms();

        /*
         * Track any iframe form created afterwards
         */
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var curElement = mutation.addedNodes[i];

                        if ( typeof curElement.tagName !== 'undefined' && curElement.tagName.toUpperCase() == 'IFRAME') {
                            
                            confection.monitorIframedForms(curElement);

                        }
                    }
                }
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true,
        });

    }

    /*
     * Function which will late start triggers
     * and functionalities so user may edit options
     * in time for execution
     */
    startBuild() {
        
        /*
        * Request or retrieve consent
        */
        this.checkConsent(true);

        

        /*
         * Generate or retrieve the UUID
         */
        this.generateUUID();

        

        /*
         * Track and send events
         */
        if (this.analytics === true) {
            this.analyticsTrack();
        }

    }


    /*
     * Track default analytics events
     */
    analyticsTrack() {

        var sendData = {};
        sendData.url = window.location.href;

        //Send referrer url
        if (document.referrer != '' && document.referrer !== undefined)
            sendData.referrer = document.referrer;

        sendData.language = navigator.language || navigator.userLanguage;

        //Send if mobile or desktop
        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
            sendData.device = 'mobile';
        else
            sendData.device = 'desktop';

        sendData = JSON.stringify(sendData);
        
        //Send Pageview
        this.submitEvent("pageviewBatch", sendData);

        //Check how many time page took to load
        window.addEventListener("load", function(event) {
            confection.submitEvent("loadtime", ((window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart)/1000) );
        });

    }



    /*
     * Generate the random UUID
     */
    generateUUID() {


        var currentTime = new Date(),
            uuid = false;

        //Check cookie
        uuid = this.getCookie('uuid');
        if (uuid.length != 36) {

            //Year Block
            uuid = this.hexConvert( currentTime.getUTCFullYear() ) + '-';

            //Hour Block
            uuid +=  this.hexSingleConvert( currentTime.getUTCHours() ) + this.hexSingleConvert( currentTime.getUTCMinutes() ) + '-';

            //Version Block
            uuid += this.hexSingleConvert( this.random_number(64, 79) ) + this.hexSingleConvert( currentTime.getUTCMonth() + 1 ) + '-';

            //Seconds Block
            uuid += this.hexSingleConvert( this.random_number(128, 191) ) + this.hexSingleConvert( currentTime.getUTCSeconds() ) + '-';

            //Random Block
            uuid += this.hexSingleConvert( this.random_number(0, 255) ) + this.hexSingleConvert( this.random_number(0, 255) ) + this.hexSingleConvert( this.random_number(0, 255) ) + this.hexSingleConvert( this.random_number(0, 255) ) + this.hexSingleConvert( this.random_number(0, 255) ) + this.hexSingleConvert( this.random_number(0, 255) );

            this.setCookie('uuid', uuid, true);
        }

        this.uuid = uuid;


        var event = new CustomEvent('ConfectionUuidGenerated', {
            detail: {
                uuid: this.uuid
            }
        });
        window.dispatchEvent(event);

    }



    /*
     * Convert a multiple digit number
     * into it's hex value
     */
    hexConvert( num ) {

        num = num.toString();
        var result = '';

        for (let index = 0; index < num.length; index++) {
            const element = parseInt(num[index]);
            result += this.hexSingleConvert(element);
        }
        
        return result;
    }



    /*
     * Convert a single digit element
     * into it's two digit hex value
     */
    hexSingleConvert( num ) {
        num = num.toString(16);
        if (num.length == 1) {
            num = '0' + num;
        }
        return num;
    }



    /*
     * Check if consent is in cookies
     * or invoke the consent window
     */
    checkConsent( firstLoad ) {

        var consent = this.getCookie('consent');

        if ( consent != "" ) {
            consent = parseInt(consent);
            if (consent >= 0 && consent <= 2 ) {
                this.setConsent(consent);
                firstLoad = false;
            }
        }

        if (this.showBanner === true) {
            this.showPrivacyBanner();
            if (firstLoad !== true) {
                if (consent == 1) {
                    this.showPrivacyBanner.firstConsent();
                } else if (consent == 2) {
                    this.showPrivacyBanner.secondConsent();
                } else {
                    this.showPrivacyBanner.openBanner();
                }
            }
        }
    }


    /*
     * Set the consent level
     */
    setConsent( level ) {

        if (level == 0) {
            this.setCookie('consent', level);
            this.consent = level;
        } else {
            this.consent = level;
            this.setCookie('consent', level);
            this.lateSubmit();
        }

    }


    /*
     * Defines the banner position
     */
    setBannerPosition( position ) {
        if (position == 'none') {
            this.showBanner = false;
        } else {
            this.bannerPosition = position;
        }
    }


    /*
     * Set a specific privacy rule
     * 0 = none
     * 1 = default (gdpr, ccpa)
     * 2 = strict (lgpd)
     */
    setPrivacy( privacy ) {

        if (privacy == 2 || privacy == 'strict' || privacy == 'lgpd' || privacy == 'LGPD') {
            this.privacy = 'strict';
        } else if (privacy == 0 || privacy == 'none') {
            this.privacy = 'none';
        } else {
            this.privacy = 'default';
        }
            
    }


    /*
     * Check if we can submit data based if data
     * is PSI.
     */
    checkPrivacy( isPSI ) {

        //No privacy, no need to hold
        if (this.privacy == 'none')
            return true;

        //Maximum consent, no need to hold
        if (this.consent >= 2)
            return true;

        //Check strict cases
        if (this.privacy === 'strict') {

            //If some consent, may allow non isPSI
            if ( this.consent >= 1)
                return !isPSI;

            //No consent at all, do not allow
            return false;

        }

        //Maximum consent for default, no need to hold
        if (this.consent >= 1)
            return true;

        //Otherwise, may allow non PSI
        return !isPSI;
            
    }


    logoSvg( color ) {
        return '<svg style="position: absolute;width: 30px;height: 30px;top: 10px;left: 50%;transform: translateX(-50%); xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="'+ color +'" d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12C21 10.34 19.66 9 18 9z"/></svg>';
    }


    /*
     * Display the privacy banner
     */
    showPrivacyBanner() {

        if (this.showedBanner == 1) {
            return;
        }
        
        this.showedBanner = 1;

        var badge = document.createElement("DIV");  
        badge.style.cssText = 'max-width: 100%; padding: 10px; color: #111; font-size: 14px; position: fixed; bottom: 20px; right: 0;font-family: Arial; text-align: center; transition: width: 0.3s; display: flex; align-items: start; z-index: 2147483640;';
        if (this.bannerPosition == 'left')
            badge.style.cssText += 'right: initial; left: 0;';
        else if (this.bannerPosition == 'center')
            badge.style.cssText += 'right: initial; left: 50%; transform: translateX(-50%);';

        var badgeToggler = document.createElement("DIV");
        badgeToggler.style.cssText = 'margin: 0 5px; border-radius: 100%; width: 50px; flex: 0 0 50px; padding: 0; height: 50px; background: #000; box-shadow: 1px 1px 3px 0 rgba(0,0,0,0.3);position: relative;';
        badgeToggler.innerHTML = this.logoSvg('#fff');

        if (confection.privacy != 'none')
            badgeToggler.style.cssText += 'cursor: pointer;';
        
        var privacyLink = document.createElement("a");
        privacyLink.style.cssText = 'font-weight: 400; text-decoration: underline; color: #444; display: block; padding-top: 5px;';
        privacyLink.innerHTML = confection.i18n.button_more;
        privacyLink.target = '_blank';
        privacyLink.href = 'https://confection.io/people?utm_source=Confection-Banner&utm_medium=' + confection.domain;

        privacyLink.style.color = '#fff';

        badge.appendChild(badgeToggler);
        badge.onclick = function(){
            confection.showPrivacyBanner.openBanner();
        }
        var banner = document.createElement("DIV");

        //Get ready to get new user consent
        if (this.checkPrivacy(true) !== true) {
            document.addEventListener('change', function (e) {
                if (confection.privacy == 'strict') {
                    confection.forceBannerOpen = false;
                    confection.showPrivacyBanner.openBanner( true );
                } else if (confection.privacy == 'default') {
                    confection.forceBannerOpen = false;
                    confection.showPrivacyBanner.openBanner( false );
                }
            });
        }

        var firstBannerOpenedOnce = false;
        this.showPrivacyBanner.openBanner = function openBanner( openPsiBanner ) {

            if (confection.privacy == 'none')
                return;
            
            if (firstBannerOpenedOnce === true && confection.forceBannerOpen !== true) {
                if (openPsiBanner === true) {
                    openBannerStrict(true);
                }
                return;
            }
            firstBannerOpenedOnce = true;

            confection.showedBanner = 2;
            badge.onclick = '';

            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }
            banner = document.createElement("DIV");
            banner.style.cssText = 'width: 400px; max-width: 100%; font-weight: 400; background: #0d80fb; color: #fff; padding: 10px; font-size: 12px;' ;

            banner.innerHTML = '<span style="text-align: left; display: block;">'+ confection.i18n.banner_base +'</span><br />';
            if (confection.privacy == 'strict')
                banner.innerHTML += '<span style="text-align: left; display: block;">'+ confection.i18n.banner_strict_base +'</span><br />';
            
            if (confection.bannerPosition == 'left')
                badge.insertBefore(banner, badgeToggler);
            else
                badge.appendChild(banner);
            
            var buttonAccept = document.createElement("a");
            buttonAccept.style.cssText = 'font-weight: 400;padding-top: 5px;background: #03a9f4;display: inline-block;height: 30px;width: 100px;color: #fff;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonAccept.innerHTML = confection.i18n.button_accept;
            buttonAccept.href = '#';
            buttonAccept.onmouseover = function(){
                this.style.background = '#2196f3';
            }
            buttonAccept.onmouseleave = function(){
                this.style.background = '#03a9f4';
            }
            banner.appendChild(buttonAccept);

            buttonAccept.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                confection.showPrivacyBanner.firstConsent( openPsiBanner  );

                return;
            }
            
            var buttonDeny = document.createElement("a");
            buttonDeny.style.cssText = 'font-weight: 400;padding-top: 5px;background: transparent;display: inline-block;height: 30px;width: 70px;color: #eee;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonDeny.innerHTML = confection.i18n.button_deny;
            buttonDeny.href = '#';
            buttonDeny.onmouseover = function(){
                this.style['text-decoration'] = 'underline';
            }
            buttonDeny.onmouseleave = function(){
                this.style['text-decoration'] = 'none';
            }
            banner.appendChild(buttonDeny);

            buttonDeny.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                badge.removeChild(banner);

                badge.onclick = function(){
                    confection.forceBannerOpen = true;
                    openBanner();
                    confection.forceBannerOpen = false;
                }
            }

            banner.appendChild(privacyLink);
        }

        this.showPrivacyBanner.firstConsent = function firstConsent( openPsiBanner  ) {
                
            confection.setConsent(1);
            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }
            badge.onclick = '';

            privacyLink.innerHTML = confection.i18n.button_more;
            privacyLink.href = 'https://confection.io/people/?utm_source=Confection-Banner&utm_medium=' + confection.domain;

            if (confection.privacy == 'strict') {
                
                badgeToggler.style.background = '#ffc107';
                
                //Open following banner immediately
                if (openPsiBanner === true) {
                    openBannerStrict(true);
                } else {
                    badge.onclick = function(){
                        openDenyBanner();
                    }
                }
            } else {
                badgeToggler.style.background = '#6a8e73';
                badge.onclick = function(){
                    openDenyBanner();
                }
            }

        };

        var secondBannerOpenedOnce = false;
        function openBannerStrict( checkSecondCall ) {

            if (checkSecondCall === true && secondBannerOpenedOnce !== false)
                return;
            
            if (secondBannerOpenedOnce === true && confection.forceBannerOpen !== true)
                return;
            secondBannerOpenedOnce = true;

            badge.onclick = '';
            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }
            banner = document.createElement("DIV");
            banner.style.cssText = 'width: 400px; max-width: 100%; font-weight: 400; background: #0d80fb; color: #fff; padding: 10px; font-size: 12px;' ;
            banner.innerHTML = '<span style="text-align: left; display: block;">'+ confection.i18n.banner_strict +'</span><br />';

            if (confection.bannerPosition == 'left')
                badge.insertBefore(banner, badgeToggler);
            else
                badge.appendChild(banner);
            
            var buttonAccept = document.createElement("a");
            buttonAccept.style.cssText = 'font-weight: 400;padding-top: 5px;background: #03a9f4;display: inline-block;height: 30px;width: 100px;color: #fff;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonAccept.innerHTML = confection.i18n.button_accept;
            buttonAccept.href = '#';
            buttonAccept.onmouseover = function(){
                this.style.background = '#2196f3';
            }
            buttonAccept.onmouseleave = function(){
                this.style.background = '#03a9f4';
            }
            banner.appendChild(buttonAccept);

            buttonAccept.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                confection.showPrivacyBanner.secondConsent();
            }
            
            var buttonDeny = document.createElement("a");
            buttonDeny.style.cssText = 'font-weight: 400;padding-top: 5px;background: transparent;display: inline-block;height: 30px;width: 70px;color: #eee;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonDeny.innerHTML = confection.i18n.button_deny;
            buttonDeny.href = '#';
            buttonDeny.onmouseover = function(){
                this.style['text-decoration'] = 'underline';
            }
            buttonDeny.onmouseleave = function(){
                this.style['text-decoration'] = 'none';
            }
            banner.appendChild(buttonDeny);

            buttonDeny.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                badge.removeChild(banner);

                badge.onclick = function(){
                    openDenyBanner();
                }
            }

            banner.appendChild(privacyLink);
            
        }

        this.showPrivacyBanner.secondConsent = function secondConsent() {
                
            badge.onclick = '';

            confection.setConsent(2)
            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }

            badgeToggler.style.background = '#6a8e73';

            //All set. All consent needed got.
            badge.onclick = function(){
                openDenyBanner();
            }

        };


        function openDenyBanner() {

            badge.onclick = '';

            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }
            banner = document.createElement("DIV");
            banner.style.cssText = 'width: 400px; max-width: 100%; font-weight: 400; background: #666; color: #fff; padding: 10px; font-size: 12px;' ;
            
            banner.innerHTML = '<span style="text-align: left; display: block;">'+ confection.i18n.banner_collecting +'</span>';

            if (confection.bannerPosition == 'left')
                badge.insertBefore(banner, badgeToggler);
            else
                badge.appendChild(banner);
            
            var buttonAccept = document.createElement("a");
            buttonAccept.style.cssText = 'font-weight: 400;padding-top: 5px;background: #03a9f4;display: inline-block;height: 30px;width: 70px;color: #fff;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonAccept.innerHTML = confection.i18n.button_accept;
            buttonAccept.href = '#';
            buttonAccept.onmouseover = function(){
                this.style.background = '#2196f3';
            }
            buttonAccept.onmouseleave = function(){
                this.style.background = '#03a9f4';
            }
            banner.appendChild(buttonAccept);

            buttonAccept.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                badge.removeChild(banner);
                badge.onclick = function(){
                    openDenyBanner();
                }

            }
            
            var buttonDeny = document.createElement("a");
            buttonDeny.style.cssText = 'font-weight: 400;padding-top: 5px;background: transparent;display: inline-block;height: 30px;width: 100px;color: #eee;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonDeny.innerHTML = confection.i18n.button_stop;
            buttonDeny.href = '#';
            buttonDeny.onmouseover = function(){
                this.style['text-decoration'] = 'underline';
            }
            buttonDeny.onmouseleave = function(){
                this.style['text-decoration'] = 'none';
            }
            banner.appendChild(buttonDeny);

            buttonDeny.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                badge.removeChild(banner);
                confection.consentLost = confection.consent;
                confection.setConsent(0);

                badgeToggler.style.background = '#000';
                
                badge.onclick = function(){
                    confection.showPrivacyBanner.regainConsent();
                }

            }

            banner.appendChild(privacyLink);
        }

        var isRegainConsentOpen = false;
        this.showPrivacyBanner.regainConsent = function regainConsent() {
            
            if (isRegainConsentOpen === true)
                return;
            isRegainConsentOpen = true;

            badge.onclick = '';
            if (banner.parentNode == badge) {
                badge.removeChild(banner);
            }

            banner = document.createElement("DIV");
            banner.style.cssText = 'width: 400px; max-width: 100%; font-weight: 400; background: #0d80fb; color: #fff; padding: 10px; font-size: 12px;' ;
            banner.innerHTML = '<span style="text-align: left; display: block;">'+ confection.i18n.banner_none + '<a href="https://confection.io/people?utm_source=Confection-Banner&utm_medium=' + confection.domain +'" target="_blank" style="color: #fff; text-decoration: underline;">'+ confection.i18n.button_click +'</a></span><br />';
            
            if (confection.bannerPosition == 'left')
                badge.insertBefore(banner, badgeToggler);
            else
                badge.appendChild(banner);
            
            var buttonAccept = document.createElement("a");
            buttonAccept.style.cssText = 'font-weight: 400;padding-top: 5px;background: #03a9f4;display: inline-block;height: 30px;width: 150px;color: #fff;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonAccept.innerHTML = confection.i18n.button_resume;
            buttonAccept.href = '#';
            buttonAccept.onmouseover = function(){
                this.style.background = '#2196f3';
            }
            buttonAccept.onmouseleave = function(){
                this.style.background = '#03a9f4';
            }
            banner.appendChild(buttonAccept);

            buttonAccept.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                isRegainConsentOpen = false;
                if (confection.consentLost == 1) {
                    confection.showPrivacyBanner.firstConsent();
                } else {
                    confection.showPrivacyBanner.secondConsent();
                }

                return;
            }
            
            var buttonDeny = document.createElement("a");
            buttonDeny.style.cssText = 'font-weight: 400;padding-top: 5px;background: transparent;display: inline-block;height: 30px;width: 70px;color: #eee;text-decoration: none;line-height: 30px;padding: 0;margin: 5px; transition: all 0.25s;';
            buttonDeny.innerHTML = confection.i18n.button_close;
            buttonDeny.href = '#';
            buttonDeny.onmouseover = function(){
                this.style['text-decoration'] = 'underline';
            }
            buttonDeny.onmouseleave = function(){
                this.style['text-decoration'] = 'none';
            }
            banner.appendChild(buttonDeny);

            buttonDeny.onclick = function(e){
                e.preventDefault();
                e.stopPropagation();

                badge.removeChild(banner);
                isRegainConsentOpen = false;

                badge.onclick = function(){
                    confection.showPrivacyBanner.regainConsent();
                }
            }

            banner.appendChild(privacyLink);
        }
        
        
        document.body.appendChild(badge); 

    }



    /*
     * Check if target is valid input and send
     * data to confection
     * $e should be the input event
     */
    checkInput( e ) {
    
        //Check if valid input types with valid value
        if (    e.target.name != '' && 
                e.target.value != '' && 
                e.target.validity.valid === true && 
                (   
                    ( e.target.tagName.toUpperCase() == 'INPUT' && new Array('BUTTON', 'FILE', 'IMAGE', 'PASSWORD', 'RESET', 'SEARCH', 'SUBMIT').indexOf(e.target.type.toUpperCase()) == -1) ) ||
                    ( new Array('SELECT', 'TEXTAREA', 'DATALISTA').indexOf(e.target.tagName.toUpperCase()) > -1) 
                )    {
                var ignoreNames = [ 'credit-card', 'credit_card', 'creditcard', 'card-number', 'card_number', 'cardnumber', 'security', 'security-code', 'security_code', 'securitycode', 'password', 'pass', 'passphrase' ],
                    fieldName = e.target.name.toLowerCase();

                if (ignoreNames.indexOf( fieldName ) == -1) {
                    if (confection.ignoreFields.indexOf( fieldName ) == -1) {
                        confection.submit(fieldName, e.target.value);
                    }
                }
        }

    }



    /*
     * Generates a random number
     * betwen $min and $max, with $amount chars size 
     */
    random_number(min, max) {

        return Math.round(Math.random() * (max - min) + min);

    }


    /*
     * Check iframed Forms
     */
    checkIframedForms() {

        var possibleIframes = document.querySelectorAll('iframe');
        for (var i = 0; i < possibleIframes.length; i++) {
            
            try {
                this.monitorIframedForms(possibleIframes[i]);
            } catch(err) {
                //do nothin
            }

        }

    }


    /*
     * Try to monitor iframed Forms
     */
    monitorIframedForms( curElement ) {

        //Maybe check if not CORS?


        var iframeContent = this.canReadIframeContent(curElement);

        if (iframeContent === false) {
        } else {

            var foundElements = iframeContent.querySelectorAll('input');
            
            if (foundElements.length == 0) {
                setTimeout(() => {
                    foundElements = iframeContent.querySelectorAll('input');
                    if (foundElements.length == 0) {
                    } else {
                        iframeContent.addEventListener('change', function (e) {
                            confection.checkInput(e);
                        });
                    }
                }, 2000);
            } else {
                iframeContent.addEventListener('change', function (e) {
                    confection.checkInput(e);
                });
            }

        }
            
    }


    /*
     * Check if can read iframe
     */
    canReadIframeContent( curElement ) {

        try { 
            var content = iframe.contentDocument || iframe.contentWindow.document;
            return content;
        } catch(err){
            return false;
        }

        return false;

    }




    /*
     * Submits to bridge script the uuid and domain
     * as well $name and $value, and account ID
     */
    submit( name, value, type, callback ) {

        if (typeof callback != 'function') callback = function(){};

        if (this.uuid === false)
            this.uuid = this.generateUUID();

        if (type != 'event')
            type = 'field';

        var paramaters = '?';

        if (type == 'field') {
            if (this.checkPrivacy(true) === false) {
                this.saveForLater(name, value, 'fields');
                callback(false);
                return false;
            } else {
                paramaters += '&name=' + name;
            }
        } else {
            if (this.checkPrivacy(false) === false) {
                this.saveForLater(name, value, 'events');
                callback(false);
                return false;
            } else {
                paramaters += '&event=' + name;
            }
        }
        paramaters += '&account_id='+ confection_account_id +'&uuid=' + this.uuid + '&value=' + encodeURIComponent(value) + '&domain=' + this.domain;


        if(this.wss.readyState === this.wss.OPEN) {
            this.wss.send(paramaters);
        } else {
            this.saveForLater(name, value, type);
            if (this.wssTimeout === false) {
                this.wssTimeout = setTimeout(() => {
                    this.lateSubmit();
                }, 3000);
            }
        }
        
    }

    //Helper for event
    submitEvent( name, value, callback ) {
        this.submit(name, value, 'event', callback);
    }



    /*
     * Save submitted data in memory until
     * we can submit it.
     */
    saveForLater(name, value, type) {

        if (type == 'event') type = 'events';
        if (type == 'field') type = 'fields';

        this.later[type][name] = value;

        if (type == 'cookies' && name == '_short_cookie_uuid')
            return;

        //Banner is set to open but never opened
        if (this.showedBanner == 1) {
            if (type == 'field' && this.privacy == 'strict') {
                this.showPrivacyBanner.openBanner(true);
            } else {
                this.showPrivacyBanner.openBanner();
            }
        }
       
    }



    /*
     * Send submitted data which is in memory
     */
    lateSubmit() {

        var innerValue = '';
        if (this.checkPrivacy(true) === true) {
            for (var key in this.later['fields']) {
                if (this.later['fields'].hasOwnProperty(key)) {
                    innerValue = this.later['fields'][key];
                    delete this.later['fields'][key];
                    this.submit(key, innerValue, 'field');
                }
            }
        }
        
        if (this.checkPrivacy(false) === true) {
            for (var key in this.later['events']) {
                if (this.later['events'].hasOwnProperty(key)) {
                    innerValue = this.later['events'][key];
                    delete this.later['events'][key];
                    this.submit(key, innerValue, 'event');
                }
            }

            for (var key in this.later['cookies']) {
                if (this.later['cookies'].hasOwnProperty(key)) {
                    innerValue = this.later['cookies'][key];
                    delete this.later['cookies'][key];
                    if (key.indexOf('_short_cookie_') >= 0) {
                        key = key.replace('_short_cookie_', '');
                        this.setCookie(key, innerValue, true);
                    } else {
                        this.setCookie(key, innerValue);
                    }
                }
            }
        }
       
    }


    /*
     * Interact with cookie
     */
    setCookie(name, value, shortExpires) {
        name = typeof name !== "undefined" ? name : "";

        if (!name) {
            return "";
        } else {
            name = 'confection_' + name;
        }

        if (this.checkPrivacy(false) === true) {
            if (shortExpires === true) {
                document.cookie = name + "=" + value + "; path=/";
            } else {
                var d = new Date();
                d.setTime(d.getTime() + 31536000000);
                document.cookie = name + "=" + value + "; expires=" + d.toUTCString() + "; path=/";
            }
        } else {
            name = name.replace('confection_', '');
            if (shortExpires === true)
                name = '_short_cookie_' + name;
            this.saveForLater(name, value, 'cookies');
        }

    }
    getCookie(name) {
        name = typeof name !== "undefined" ? name : "";

        if (!name) {
            return "";
        } else {
            name = 'confection_' + name;
        }

        name += "=";
        var cookies = document.cookie.split(";");
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf(name) == 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }

        return "";

    }
}

var confection = new Confection();

window.dispatchEvent(new CustomEvent('ConfectionReady'));

let config = document.getElementsByTagName("SCRIPT");

for (let script of document.getElementsByTagName("SCRIPT")) {
    if (script.id && script.src.search('confection-generator') > 0) {
        let configData = script.id;
        configData = configData.split("-");

        if (configData[1].length == 3) {

            let privacyOptions = [
                "none",
                "GDPR",
                "CCPA",
                "LGPD"
            ];
            confection.setPrivacy(privacyOptions[configData[1].charAt(0)]);

            let positionOptions = [
                "left",
                "center",
                "right",
            ];
            confection.setBannerPosition(positionOptions[configData[1].charAt(1)]);

            let analyticsOptions = [
                false,
                true,
            ];
            confection.analytics = analyticsOptions[configData[1].charAt(2)];

            var confection_account_id = configData[0];

        }
    }
}

confection.startBuild();