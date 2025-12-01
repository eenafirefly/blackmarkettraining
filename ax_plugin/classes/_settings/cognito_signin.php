<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Cognito
{
    private $cognito_signin_settings_key = 'axip_cognito_signin_settings';
    const cognito_signin_settings_key = 'axip_cognito_signin_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {
        add_settings_section('section_cognito', __('Cognito Settings', 'axip'), array(
            &$this,
            'section_cognito_desc',
        ), self::cognito_signin_settings_key);

        add_option('ax_cognito_enabled', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_enabled');
        add_settings_field('ax_caching_enabled', __('Enable Cognito Signin:', 'axip'), array(
            &$this,
            'ax_cognito_enabled',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_client_id', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_client_id');
        add_settings_field('ax_cognito_client_id', __('Client ID:', 'axip'), array(
            &$this,
            'ax_cognito_client_id',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_user_pool', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_user_pool');
        add_settings_field('ax_cognito_user_pool', __('User Pool:', 'axip'), array(
            &$this,
            'ax_cognito_user_pool',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_domain', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_domain');
        add_settings_field('ax_cognito_domain', __('Congito Domain:', 'axip'), array(
            &$this,
            'ax_cognito_domain',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_redirect_url', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_redirect_url');
        add_settings_field('ax_cognito_redirect_url', __('Congito Redirect Url:', 'axip'), array(
            &$this,
            'ax_cognito_redirect_url',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_custom_provider', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_custom_provider');
        add_settings_field('ax_cognito_custom_provider', __('Custom Provider:', 'axip'), array(
            &$this,
            'ax_cognito_custom_provider',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_custom_provider_label', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_custom_provider_label');
        add_settings_field('ax_cognito_custom_provider_label', __('Custom Provider Label:', 'axip'), array(
            &$this,
            'ax_cognito_custom_provider_label',
        ), self::cognito_signin_settings_key, 'section_cognito');

        add_option('ax_cognito_custom_exclusive', '', '', false);
        register_setting(self::cognito_signin_settings_key, 'ax_cognito_custom_exclusive');
        add_settings_field('ax_cognito_custom_exclusive', __('Custom Provider Exclusive:', 'axip'), array(
            &$this,
            'ax_cognito_custom_exclusive',
        ), self::cognito_signin_settings_key, 'section_cognito');

    }

    public function ax_cognito_enabled()
    {
        $optVal = get_option('ax_cognito_enabled', 'cognito_disabled');
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "cognito_disabled";
            update_option('ax_cognito_enabled', $optVal, false);
        }
        $options = array(
            "cognito_enabled" => "Cognito enabled",
            "v2_cognito" => "Cognito Auth 2.0",
            "cognito_disabled" => "No Cognito",
        );
        echo '<select name="ax_cognito_enabled">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }
    public function ax_cognito_custom_exclusive()
    {
        $optVal = get_option('ax_cognito_custom_exclusive', false);
        $optActive = !empty($optVal);
        $options = array(
            true => "Only the Custom Provider",
            false => "Show all options",

        );

        echo '<select name="ax_cognito_custom_exclusive">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }

    public function ax_cognito_client_id()
    {
        $optVal = get_option('ax_cognito_client_id', "");
        echo '<input name="ax_cognito_client_id" type="text" value="' . $optVal . '" />';
    }

    public function ax_cognito_user_pool()
    {
        $optVal = get_option('ax_cognito_user_pool', "");
        echo '<input name="ax_cognito_user_pool" type="text" value="' . $optVal . '" />';
    }

    public function ax_cognito_domain()
    {
        $optVal = get_option('ax_cognito_domain', "");
        echo '<input name="ax_cognito_domain" type="text" value="' . $optVal . '" />';
    }

    public function ax_cognito_redirect_url()
    {
        $optVal = get_option('ax_cognito_redirect_url', get_site_url(null, 'cognito_redirect', null));
        echo '<input name="ax_cognito_redirect_url" type="text" value="' . $optVal . '" />';
    }

    public function ax_cognito_custom_provider()
    {
        $optVal = get_option('ax_cognito_custom_provider', '');
        echo '<input name="ax_cognito_custom_provider" type="text" value="' . $optVal . '" />';
        echo '<em>Add a custom provider in addition to the standard providers. This would be used to provide a corporate sign in option. Note this must match your recorded IDP identifier exactly and is case sensitive.</em>';
    }

    public function ax_cognito_custom_provider_label()
    {
        $optVal = get_option('ax_cognito_custom_provider_label', '');
        echo '<input name="ax_cognito_custom_provider_label" type="text" value="' . $optVal . '" />';
        echo '<em>Text to display for the custom provider.</em>';
    }

    public function section_cognito_desc()
    {
        echo '<p>Sign in via cognito!</p>';
    }

}
