<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die();

if (!class_exists('AX_Mothership')) {

    class AX_Mothership
    {

        const DEFAULT_PROD_URL = 'https://app.axcelerate.com';
        const DEFAULT_STAGING_URL = 'https://stg.axcelerate.com';
        const DEFAULT_TESTING_URL = 'https://tst.axcelerate.com';

        public static function get_mothership_domain_for_environment($environment)
        {

            /*$AxcelerateAPI = new AxcelerateAPI();

            $domain = $AxcelerateAPI->get_api_base_domain(false);

            return str_replace('/api', '', $domain);
             */
            $axip_settings = get_option('axip_general_settings');
            switch ($environment) {
                case 'STAGING':
                    return self::DEFAULT_STAGING_URL;
                case 'TESTING':
                    return self::DEFAULT_TESTING_URL;
                case 'PRODUCTION':
                    return self::DEFAULT_PROD_URL;
                default:
                    $url = str_replace('/api', '', $axip_settings['webservice_base_path']);
                    if (strpos($url, 'app.axcelerate') !== false) {
                        return self::DEFAULT_PROD_URL;
                    }
                    return $url;
            }

        }
        public static function get_mothership_domain_for_current_environment()
        {

            $environment = get_option('ax_environment', 'unset');
            return self::get_mothership_domain_for_environment($environment);
        }

    }
}
