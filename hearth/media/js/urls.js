define('urls',
    ['buckets', 'capabilities', 'format', 'settings', 'underscore', 'user', 'utils'],
    function(buckets, caps, format, settings, _) {

    var group_pattern = /\(.+\)/;
    var reverse = function(view_name, args) {
        args = args || [];
        for (var i in routes) {
            var route = routes[i];
            if (route.view_name != view_name)
                continue;

            // Strip the ^ and $ from the route pattern.
            var url = route.pattern.substring(1, route.pattern.length - 1);

            // TODO: if we get significantly complex routes, it might make
            // sense to _.memoize() or somehow cache the pre-formatted URLs.

            // Replace each matched group with a positional formatting placeholder.
            var i = 0;
            while (group_pattern.test(url)) {
                url = url.replace(group_pattern, '{' + i++ + '}');
            }

            // Check that we got the right number of arguments.
            if (args.length != i) {
                console.error('Expected ' + i + ' args, got ' + args.length);
                throw new Error('Wrong number of arguments passed to reverse(). View: "' + view_name + '", Argument "' + args + '"');
            }

            return format.format(url, args);

        }
        console.error('Could not find the view "' + view_name + '".');
    };

    var api_endpoints = {
        'app': '/api/v1/apps/app/{0}/',
        'category': '/api/v1/apps/search/featured/?cat={0}',
        'categories': '/api/v1/apps/category/',
        'reviews': '/api/v1/apps/rating/',
        'settings': '/api/v1/account/settings/mine/',
        'installed': '/api/v1/account/installed/mine/',
        'login': '/api/v1/account/login/',
        'record': '/api/v1/receipts/install/',
        'app_abuse': '/api/v1/abuse/app/',
        'user_abuse': '/api/v1/abuse/user/',
        'search': '/api/v1/apps/search/',
        'feedback': '/api/v1/account/feedback/',
        'terms_of_use': '/terms-of-use.html',
        'privacy_policy': '/privacy-policy.html'
    };

    var _device = _.once(function() {
        if (caps.firefoxOS) {
            return 'firefoxos';
        } else if (caps.firefoxAndroid) {
            return 'android';
        } else {
            return 'desktop';
        }
    });

    var user = require('user');
    function _userArgs(func) {
        return function() {
            var out = func.apply(this, arguments);
            var args = {
                format: 'json',
                lang: navigator.language,
                region: user.get_setting('region') || '',
                //scr: caps.widescreen ? 'wide' : 'mobile',
                //tch: caps.touch,
                dev: _device(),
                pro: buckets.get_profile()
            };
            if (user.logged_in()) {
                args._user = user.get_token();
            }
            if (settings.carrier) {
                args.carrier = settings.carrier.slug;
            }
            return require('utils').urlparams(out, args);
        };
    }

    var api = function(endpoint, args) {
        if (!(endpoint in api_endpoints)) {
            console.error('Invalid API endpoint: ' + endpoint);
            return '';
        }
        return settings.api_url + format.format(api_endpoints[endpoint], args || []);
    };

    var apiParams = function(endpoint, params) {
        return require('utils').urlparams(api(endpoint), params);
    };

    return {
        reverse: reverse,
        api: {
            url: _userArgs(api),
            params: _userArgs(apiParams),
            sign: _userArgs(_.identity),
            unsigned: {
                url: api,
                params: apiParams
            }
        }
    };
});