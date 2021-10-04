# About

Confection collects, stores, and distributes data in a way that's unaffected by client-side disruptions involving cookies, cross-domain scripts, and device IDs. It's also compliant with global privacy laws so it’s good for people too. And it integrates with the apps businesses and developers already use. There’s no need to switch systems. Just plug in, power up, and keep your marketing partnerships running strong.

This script helps Confection customers add Confection to their sites.

Need help getting started? See [confection.io/quick-start/wss](https://confection.io/quick-start/wss) Need an account? Set one up @ [https://dashboard.confection.io/register](dashboard.confection.io/register) (It's free.)

## Usage
Add the script to the any webpage.

```
 <script id="0000-000" src="./confection-generator.js" defer></script>
```

Add the script tag element to your page and set attribute values for confection settings.

The first 4 digits are for your account id value, found on your confection dashboard.
The last 3 digits are configuration values.

- The first position is the privacy type setting.

- The second tells the confection component where to render, left center or right.

- The third position enables or disables analytics.

For instance if your account id is 7204 and you want options to be privacy type GDPR and your banner to be centered and analytics enabled. Your script id would look like this.

```
id="7204-111"
```

Option values are found below.

## Options


Valid values for confection settings are as follows:

* Your account ID can be found found in your Confection account dashboard.

- Confection uses a compact, minimally-invasive banner to get user consent. Unlike other consent banners, ours only appears when necessary. Position attribute values are:

    - left = 0
    - center = 1
    - right = 2


- Until Confection gets consent from a user, it will only collect non-personally-identifying information.
Confection allows users to collect, store, and distribute data in accordance with the data protection law of their choice. Privacy attribute values are: 
    - none = 0 
    - gdpr = 1
    - ccpa = 2
    - lgpd = 3


- Analytics
	- false = 0
	- true = 1


## Events

Add event listners to page to get the global values.

    <script>
        window.addEventListener("ConfectionUuidGenerated", function(e){
            console.log(e.detail.uuid)
        });
    
        window.addEventListener("ConfectionAccountId", function(e){
            console.log(e.detail.account)
        });
    
        window.addEventListener("ConfectionPrivacy", function(e){
            console.log(e.detail.privacy)
        });
    
        window.addEventListener("ConfectionAnalytics", function(e){
            console.log(e.detail.analytics)
        });
    
        window.addEventListener("ConfectionPosition", function(e){
            console.log(e.detail.position)
        });
    </script>
