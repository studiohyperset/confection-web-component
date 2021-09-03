# confection-cable

Creates custom html element to configure and load Confection Banner.


## Usage
Add the script to the any webpage.

```
 <script id="0000-000" src="./confection-generator.js" defer></script>
```

Add the script tag element to your page and set attribute values for confection settings.

The first 4 digits are for your account id value. Found on your confection dashboard.
After the - the last 3 digits configure your confection settings.

- The first position is the privacy type setting.

- The second tells the confection component where to render left center or right.

- The third position enables or disables analytics.

For instance if your account id is 7204 and you want options to be privacy type GDPR and your banner to be centered and analytics enabled. Your script id we look like this.

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



