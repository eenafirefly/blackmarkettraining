<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die();

/* -------------------------------------------- */

/**
 * A class that controls session stuff
 *
 * @author Rob Bisson <rob.bisson@axcelerate.com.au>
 */
class AX_Session_Security
{
    public static $cookie_name = 'ax_ses_c';

    public static $legacy_mode = false;

    public static function checkForLogin()
    {

        $Server_Session = self::startOrGrabServerSession();

        $loginStatus = array(
            'logged_in' => false,
            'logged_in_token' => '',
        );

        $accessToken = isset($_REQUEST['access_code']) ? $_REQUEST['access_code'] : '';
        $userID = isset($_REQUEST['uid']) ? $_REQUEST['uid'] : '';
        $generateAXSession = !isset($_REQUEST['enrolment']);

        // if we have an access token, and we aren't already logged in
        if (!empty($accessToken) && empty($Server_Session["AXTOKEN"])) {
            $AxcelerateAPI = new AxcelerateAPI();
            $loginParams = array('accessCode' => $accessToken);
            if (!empty($userID)) {
                $loginParams['userID'] = $userID;
            }
            $result = $AxcelerateAPI->callResource($loginParams, '/user/login', 'POST');

            if (is_array($result)) {
                // There's no point establishing a session here.
                $loginStatus = array(
                    'logged_in' => false,
                    'logged_in_token' => '',
                    'account_choice' => $result,
                    'access_code' => $accessToken,
                );

            } else if (!empty($result) && !empty($result->AXTOKEN) && isset($Server_Session)) {

                // if no enrolment hash, make a new session.
                if ($generateAXSession) {
                    $IP = $_SERVER['REMOTE_ADDR'];
                    $session = AX_Session_Security::setupSession($result->CONTACTID, $IP);

                    if (isset($session)) {
                        $Server_Session['ax_session_id'] = $session['session_id'];
                        $loginStatus['logged_in'] = $session;
                    }

                }

                $Server_Session['AXTOKEN'] = $result->AXTOKEN;
                $Server_Session['CONTACTID'] = $result->CONTACTID;
                $Server_Session['UNAME'] = $result->USERNAME;
                $Server_Session['ROLETYPE'] = $result->ROLETYPEID;
                $Server_Session['EXPIRES'] = time() + (60 * 60);
                AX_Session_Security::saveServerSession($Server_Session);

            }
        }

        if (isset($Server_Session)) {

            if (!empty($Server_Session["AXTOKEN"]) && $Server_Session['EXPIRES'] > time()) {
                $loginStatus['logged_in'] = true;
                $loginStatus['logged_in_token'] = $Server_Session['AXTOKEN'];
                $loginStatus['logged_in_contact'] = $Server_Session['CONTACTID'];
                $loginStatus['logged_in_role'] = $Server_Session['ROLETYPE'];
            }
        }

        return $loginStatus;
    }

    public static function setupPHPSession()
    {
        add_action('init', 'AX_Session_Security::startSession', 1);

    }

    public static function getHostUrl()
    {
        return str_replace(':8888', '', $_SERVER['HTTP_HOST']);
    }
    public static function startOrGrabServerSession()
    {

        if (self::$legacy_mode) {
            $session = session_id();
            if (empty($session)) {
                session_start();
            }
            return $_SESSION;

        }
        if (!isset($_COOKIE[self::$cookie_name])) {
            //setcookie(self::$cookie_name, json_encode(array()), time() + 60 * 60, "/", self::getHostUrl(), true, false);
            $_COOKIE[self::$cookie_name] = json_encode(array());
            return array();
        } else {

            $data = json_decode(stripslashes($_COOKIE[self::$cookie_name]), true);

            return $data;
        }

    }
    public static function destroyServerSession()
    {

        if (self::$legacy_mode) {
            session_destroy();
        }
        if (isset($_COOKIE[self::$cookie_name])) {
            unset($_COOKIE[self::$cookie_name]);
            setcookie(self::$cookie_name, '', time() - 3600, '/', self::getHostUrl(), true, true); // empty value and old timestamp
        }
    }

    public static function saveServerSession($Server_Session)
    {
        if (self::$legacy_mode) {

        } else {
            $cookieValue = json_encode($Server_Session);

            setcookie(self::$cookie_name, $cookieValue, time() + 60 * 60, "/", self::getHostUrl(), true, true);
            $_COOKIE[self::$cookie_name] = $cookieValue;
        }
    }

    public static function startSession()
    {

        $sessions_enabled = get_option('ax_global_login', 0) == 1;

        $cognito = get_option('ax_cognito_enabled', 'cognito_disabled');
        $Auth2 = ($cognito === 'v2_cognito');
        if ($Auth2) {
            $sessions_enabled = true;
        }

        if ($sessions_enabled) {
            $Server_Session = self::startOrGrabServerSession();

            if (!empty($Server_Session['AXTOKEN'])) {
                $current = time();
                if (empty($Server_Session['EXPIRES'])) {
                    self::destroyServerSession();

                } else {
                    if ($current > $Server_Session['EXPIRES']) {
                        self::destroyServerSession();

                    } else if (($current + (60 * 15)) > $Server_Session['EXPIRES']) {
                        $AxcelerateAPI = new AxcelerateAPI();
                        $params = array('contactID' => $Server_Session['CONTACTID']);
                        $contact = $AxcelerateAPI->callResourceAX($params, '/contact/' . $Server_Session['CONTACTID'], 'GET', $Server_Session['AXTOKEN']);
                        if (is_object($contact)) {
                            if (!empty($contact->CONTACTID)) {
                                $Server_Session['CONTACT'] = $contact;
                                $Server_Session['CONTACTID'] = $contact->CONTACTID;
                                $Server_Session['EXPIRES'] = time() + (60 * 60);
                                self::saveServerSession($Server_Session);

                            } else {
                                self::destroyServerSession();

                            }
                        } else {
                            self::destroyServerSession();

                        }

                    }
                }

            }
        }

    }
    /**
     * Create the session, including a unique session token.
     *
     * @param [string|int] $contactID - The ID of the originating contact
     * @param [string]     $IP - IP address
     *
     * @return [array|null]
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function setupSession($contactID, $IP, $emailAddress = '')
    {
        if (empty($contactID) || empty($IP)) {
            return null;
        }
        $sessionID = "";
        $time = current_time('mysql');
        $sessionID = wp_hash($contactID . "_" . $time);
        $sessionRecord = array(
            'session_id' => $sessionID,
            'primary_contact' => $contactID,
            'allowed_contacts' => array(
                $contactID,
            ),
            'ip_address' => $IP,
            'emails_used' => !empty($emailAddress) ? array(wp_hash($emailAddress)) : array(),
        );

        $sessionStored = self::updateSession($sessionID, $sessionRecord);

        if (!empty($sessionStored)) {
            return $sessionStored;
        }

        return null;
    }

    /**
     * Get the session data from WP DB
     *
     * @param [string] $sessionID - The session token
     *
     * @return [array] - returns session object
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function retrieveSession($sessionID)
    {
        $sessionRecord = AX_Database::get_transient('ax_enrol_session_' . $sessionID);
        if (is_array($sessionRecord)) {
            return $sessionRecord;
        } else {
            return null;
        }

    }

    /**
     * Update an existing session with new data
     * Will bump the timeout period
     *
     * @param [string] $sessionID - The session token
     * @param [array]  $sessionRecord - new session data
     *
     * @return [array|null]
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function updateSession($sessionID, $sessionRecord)
    {
        //Need to decide the timeout on this.
        if (empty($sessionRecord) || empty($sessionID)) {
            return null;
        }

        AX_Database::set_transient('ax_enrol_session_' . $sessionID, $sessionRecord, 5 * DAY_IN_SECONDS, 'session');
        $response = AX_Database::get_transient('ax_enrol_session_' . $sessionID, $sessionRecord);

        if (is_array($response)) {

            return $response;
        }
        return null;

    }

    /**
     * Check to see if a session is allowed to see contact.
     *
     * @param [string]     $sessionID - The session token
     * @param [int|string] $contactID - The contact ID
     *
     * @return [boolean]
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function canSeeContact($sessionID, $contactID)
    {

        if (empty($contactID) || empty($sessionID)) {
            return false;
        }
        $sessionRecord = self::retrieveSession($sessionID);

        if (is_array($sessionRecord)) {
            if ($sessionRecord['allowed_contacts']) {

                //check if the contact exists in array
                //note without strict this should check string vs number etc
                if (in_array($contactID, $sessionRecord['allowed_contacts'])) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Update an existing session to allow it to see a contact
     *
     * @param [string]     $sessionID - The session token
     * @param [int|string] $contactID - The contact to be allowed
     *
     * @return [boolean|null]
     * @author Rob Bisson <rob.bisson@axcelerate.com.au>
     */
    public static function addAllowedContact($sessionID, $contactID, $emailAddress)
    {
        if (empty($contactID) || empty($sessionID)) {
            return null;
        }
        $sessionRecord = self::retrieveSession($sessionID);
        if (is_array($sessionRecord)) {
            if (key_exists('allowed_contacts', $sessionRecord)) {
                if (in_array($contactID, $sessionRecord['allowed_contacts'])) {
                    return true;
                } else {
                    array_push($sessionRecord['allowed_contacts'], $contactID);
                }
            } else {
                //This should never be called;
                $sessionRecord['allowed_contacts'] = array($contactID);
            }
            if (!empty($emailAddress)) {
                if (key_exists('emails_used', $sessionRecord)) {
                    $hash = wp_hash($emailAddress);
                    if (is_array($sessionRecord['emails_used'])) {
                        array_push($sessionRecord['emails_used'], $hash);
                    } else if (empty($sessionRecord['emails_used'])) {
                        $sessionRecord['emails_used'] = array($hash);
                    }
                }

            }

            $update = self::updateSession($sessionID, $sessionRecord);

        }
    }

    public static function endpointRequireCheck($endpoint, $method = "GET")
    {

        if (empty($endpoint) || empty($method)) {
            return null;
        }

        $REQUIRED_ENDPOINTS
        = array(
            '/contacts/search' => array(
                'methods' => array(
                    'GET',
                ),
            ),
            '/contact/' => array(
                'methods' => array(
                    'GET', 'PUT',
                ),
            ),
            '/contacts' => array(
                'methods' => array(
                    'GET',
                ),
            ),
        );

        $requiredKeys = array_keys($REQUIRED_ENDPOINTS);

        foreach ($requiredKeys as $key => $requiredEndpoint) {

            //Possibly will have to revisit this, not sure about the /contact/ one.

            if (!(strpos($endpoint, $requiredEndpoint) === false)) {
                if (strpos($endpoint, 'contact/source') === false) {
                    $method = strtoupper($method);
                    $methodsArray = $REQUIRED_ENDPOINTS[$requiredEndpoint]['methods'];

                    if (in_array($method, $methodsArray)) {

                        return $requiredEndpoint;
                    }
                }

            }

        }
        return false;
    }
    public static function endpointRequireSession($endpoint, $method = "GET", $sessionExists = false)
    {
        if (empty($endpoint) || empty($method)) {
            return null;
        }

        $REQUIRED_ENDPOINTS
        = array(
            '/user/login' => array(
                'methods' => array(
                    'POST',
                ),
            ),
            '/user/login/' => array(
                'methods' => array(
                    'POST',
                ),
            ),
            'user/login' => array(
                'methods' => array(
                    'POST',
                ),
            ),
            '/contact/' => array(
                'methods' => array(
                    'POST',
                ),
            ),
            'contact' => array(
                'methods' => array(
                    'POST',
                ),
            ),
        );
        if ($sessionExists) {
            $REQUIRED_ENDPOINTS['/contacts/search'] = array(
                'methods' => array(
                    'GET',
                ),
            );
        }

        $requiredKeys = array_keys($REQUIRED_ENDPOINTS);

        foreach ($requiredKeys as $key => $requiredEndpoint) {

            //Possibly will have to revisit this, not sure about the /contact/ one.

            if (!(strpos($endpoint, $requiredEndpoint) === false)) {
                if ($requiredEndpoint == "/contact/" || $requiredEndpoint == 'contact') {
                    //check for contact source call etc
                    if (strpos($endpoint, '/contact/s') === false) {
                        $method = strtoupper($method);
                        $methodsArray = $REQUIRED_ENDPOINTS[$requiredEndpoint]['methods'];

                        if (in_array($method, $methodsArray)) {
                            return "/contact/";
                        }
                    }
                } else {
                    $method = strtoupper($method);
                    $methodsArray = $REQUIRED_ENDPOINTS[$requiredEndpoint]['methods'];

                    if (in_array($method, $methodsArray)) {
                        if (strpos($requiredEndpoint, 'user/login') !== false) {
                            return "/user/login";
                        }
                        return $requiredEndpoint;
                    }
                }

            }

        }
        return false;
    }

    /**
     * Checks to determine if an email address has already been used in this session.
     */
    public static function emailAlreadyUsed($sessionID, $emailAddress)
    {
        $emailHash = wp_hash($emailAddress);

        $session = self::retrieveSession($sessionID);

        if (key_exists('emails_used', $session)) {
            $emailHashes = $session['emails_used'];
            if (!is_array($emailHashes)) {
                $emailHashes = explode(',', $emailHashes);
            }
            if (is_array($emailHashes)) {
                if (in_array($emailHash, $emailHashes)) {
                    return true;
                }
            }
        }
        return false;

    }

    public static function addAllowedContacts($sessionID, $contactList)
    {
        if (!is_array($contactList) || empty($sessionID)) {
            return null;
        }
        $sessionRecord = self::retrieveSession($sessionID);
        if (is_array($sessionRecord)) {
            if (key_exists('allowed_contacts', $sessionRecord)) {
                $allowedContacts = $sessionRecord['allowed_contacts'];
                foreach ($contactList as $contact) {

                    if (is_object($contact)) {
                        $contactID = $contact->CONTACTID;
                        if (!empty($contactID)) {
                            if (!in_array($contactID, $allowedContacts)) {
                                array_push($allowedContacts, $contactID);
                            }
                        }

                    } else if (key_exists('CONTACTID', $contact)) {
                        $contactID = $contact['CONTACTID'];

                        if (!in_array($contactID, $allowedContacts)) {
                            array_push($allowedContacts, $contactID);
                        }
                    }
                }
                $sessionRecord['allowed_contacts'] = $allowedContacts;
            } else {
                //This should never be called;
                $sessionRecord['allowed_contacts'] = array($contactID);
            }
            $update = self::updateSession($sessionID, $sessionRecord);
            return true;

        }
    }
}
