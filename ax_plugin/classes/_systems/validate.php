<?php
/**
 * Validate File
 */
defined('ABSPATH') or die('No script kiddies please!');

/**
 *
 */
class AX_Validate
{
    public function __construct()
    {
    }

    public static function checkAccess()
    {
        $temporaryAccess = AX_Database::get_transient('ax_wp_temp_access', false);
        $disableAccess = get_option('ax_wp_disable');

        if (!empty($disableAccess)) {
            self::disableAccess();
        }

        /*if temp access has not been set at all*/
        if ($temporaryAccess === false) {
            self::validateAccess();
        }
    }
    public static function validateAccess()
    {
        $flags = self::retrieveFlags();
        $wordpress = false;

        if ($flags) {
            foreach ($flags as $flag) {
                if ($flag['REFERENCENAME'] == "wordpress_plugin") {
                    $wordpress = true;
                    if ($flag['OPTIONVALUE']) {
                        self::grantTemporaryAccess();
                    } else {
                        self::disableAccess();
                    }
                }
            }
        } else {
            /*either no flags were found, or there was an error*/
            self::grantRestrictedAccess();
        }
        /*Double check to determine if the WP flag was found*/
        if (!$wordpress) {
            self::grantRestrictedAccess();
        }
    }
    private static function grantTemporaryAccess()
    {
        /*check flags every 7 days*/
        AX_Database::set_transient('ax_wp_temp_access', true, 3 * DAY_IN_SECONDS, 'other');
    }

    private static function grantRestrictedAccess()
    {
        /*allow access for 1 day, to set tokens*/
        AX_Database::set_transient('ax_wp_temp_access', true, 3 * DAY_IN_SECONDS, 'other');
    }
    private static function disableAccess()
    {
        if (is_admin()) {
            add_action('admin_notices', array('AX_Validate', 'notify'));
        }
        /*send notification to Administrator*/
        $users = get_users('role=Administrator');

        try {
            wp_mail($users[0]->user_email, 'aXcelerate Integration Plugin', "The aXcelerate integration plugin has been disabled due to trial expiry. Contact aXcelerate to set up a new trial or get full access.");
        } catch (\Throwable $th) {
            //throw $th;
        }

        /*Deactivate Plugin*/
        $plugin = AXIP_PLUGIN_NAME;
        deactivate_plugins($plugin);
    }
    public static function notify()
    {
        echo '<div class="notice notice-error is-dismissible"><h4>aXcelerate Plugin has been disabled - Contact aXcelerate to set up a new trial or get full access.</h4></div>';
    }

    private static function appRegisterRecheck()
    {
        /*check flags every 7 days*/
        AX_Database::set_transient('ax_app_register_check', true, 1 * DAY_IN_SECONDS, 'other');
    }

    public static function checkApplicationRegister()
    {
        $settings = (array) get_option('axip_general_settings');
        if (!empty($settings['api_token']) && !empty($settings['webservice_token'])) {
            $AxApi = new AxcelerateAPI();

            $registerResponse = $AxApi->callResource(array(
                'applicationURL' => site_url(),
                'applicationName' => 'Wordpress Website',
                'addIfNotFound' => true,
            ), '/v2/settings/approvedAppUrl', 'POST');

            if ($registerResponse instanceof stdClass && !empty($registerResponse->APPID)) {
                update_option('ax_recorded_site_url', site_url(), false);
                update_option('ax_recorded_site_url_error', false, false);
            } else {

                update_option('ax_recorded_site_url_error', true, false);
            }

            self::appRegisterRecheck();
        }

    }
    public static function recheckAppRegister()
    {
        if (!AX_Database::get_transient('ax_app_register_check', false)) {
            self::checkApplicationRegister();
        }
    }

    public static function checkCognitoEnabled()
    {

        $AxApi = new AxcelerateAPI();
        $settings = (array) get_option('axip_general_settings');
        $checked = AX_Database::get_transient('ax_check_cognito', false);

        /* Every 5 minutes check to see if cognito has been turned on or off */
        if (!$checked && !empty($settings['api_token']) && !empty($settings['webservice_token'])) {

            AX_Database::set_transient('ax_check_cognito', true, 5 * 60, 'other');

            $cognitoResponse = $AxApi->callResource(array(), 'settings/cognito', 'GET');
            if ($cognitoResponse instanceof stdClass && isset($cognitoResponse->COGNITO_ENABLED)) {
                $enabled = !empty($cognitoResponse->COGNITO_ENABLED);
                $cognito = get_option('ax_cognito_enabled', 'cognito_disabled');

                // Legacy cognito sites must be manually updated.
                if ($cognito !== 'cognito_enabled') {
                    $Auth2 = ($cognito === 'v2_cognito');
                    if ($enabled && !$Auth2) {
                        update_option('ax_cognito_enabled', 'v2_cognito', false);
                    }
                    if (!$enabled && $Auth2) {
                        update_option('ax_cognito_enabled', 'cognito_disabled', false);
                    }
                }

            }
        }
    }
    public static function retrieveFlags()
    {
        $settings = (array) get_option('axip_general_settings');

        /*confirm tokens exist*/
        if (!empty($settings['api_token']) && !empty($settings['webservice_token'])) {
            $AxApi = new AxcelerateAPI();
            $narrowedFlags = array();
            $flags = $AxApi->callResource(array(), 'flags', 'GET');

            $sysSettings = $AxApi->callResource(array(), 'settings/shard', 'GET');

            if ($sysSettings && $sysSettings instanceof stdClass) {
                $shardingEnabled = get_option('ax_sharding_enabled', false);
                if (isset($sysSettings->SHARDCLIENTSUBDOMAIN)) {
                    if (!empty($sysSettings->SHARDCLIENTSUBDOMAIN)) {

                        update_option('ax_sharding_enabled', true, false);
                        update_option('ax_shard_subdomain', $sysSettings->SHARDCLIENTSUBDOMAIN, false);
                    }
                }
            }

            if ($flags) {
                foreach ($flags as $flagrow) {
                    if (self::checkFlag($flagrow)) {
                        $narrowedFlags[] = (array) $flagrow;
                    }
                }

                return $narrowedFlags;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private static function checkFlag($flag)
    {
        $flagsToCheckFor = array('wordpress_plugin');
        $flag = (array) $flag;
        if ($flag) {
            if (!empty($flag["REFERENCENAME"])) {
                return in_array($flag['REFERENCENAME'], $flagsToCheckFor);
            }
            return false;
        } else {
            return false;
        }
    }
}
