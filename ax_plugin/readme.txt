=== aXcelerate Integration Plugin ===
Tags: comments, spam
Requires at least: 4.6
Tested up to: 6.0.1

Integrates Wordpress with the aXcelerate Student Management System

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/plugin-name` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Use the aXcelerate Integration Plugin Tab screen to configure the plugin

https://axcelerate.atlassian.net/wiki/spaces/WP/pages/102146626/Wordpress+Plugin+Install+Upgrade+and+Initial+Setup

== Description ==

With versions of the Wordpress Plugin above 2.8 an entirely new system for creating Course Lists, Course Detail Pages, Enrolment forms and Enquiry forms has been introduced. This significantly changes how Website Integrations are done, to offer substantial improvements in customisation and features.

Shortcodes

With version 2.8, a substantial number of new shortcodes have been added to the Plugin, allowing content pulled dynamically from aXcelerate to be added directly into existing pages within Wordpress.
The shortcodes have been fully implemented into Wordpress's page editor, allowing them to be added and configured within the editor, without a need to consult an external reference.

Course List ShortCodes
Top Level Shortcode : ax_course_list
The top level shortcode utilises a premade "template" that will embed lower level shortcodes into the page, allowing a full course list to be built simply by adding just the ax_course_list shortcode to a page. Click here for further information.

Course Details ShortCodes
Top Level Shortcode : ax_course_details
The top level shortcode utilises a premade "template" that will embed lower level shortcodes into the page, allowing a full course details page to be built simply by adding just the ax_course_details shortcode to a page. Click here for further information.

Course Instances ShortCodes
Top Level Shortcode : ax_course_instance_list
The top level shortcode utilises a premade "template" that will embed lower level shortcodes into the page, allowing course instance lists to be built simply by adding just the ax_course_instance_list shortcode to a page. Click here for further information.

Enrolment Widget
With the move to a new framework, a new replacement Enrolment/Enquiry form has been introduced. The legacy enrolment form is still in place, but can easily be replaced by the new, more customisable and feature rich Enrolment Widget.

Existing sites can switch to the enrolment widget, without having to rebuild the course list / details pages, though a setting on the old Enrolment aXpage. 


It is highly recommended however to use the new shortcode framework, as it allows better integration with Wordpress Themes and pages.
To view an upgrade guide for legacy websites, see the upgrade guide.
See the Help Section dedicated to the Enrolment Widget for more information. 

Enquiry Widget
With version 2.8.07+ of the WP Plugin, an Enquiry Widget is available in addition to the enrolment widget. This Enquiry Widget is a single form, built using the Enroller Widget Framework. It cannot be used for enrolments or portfolio uploads.
See the Help Section dedicated to Enquiries for more information.

Course Mapping
Along with the ShortCodes and Enrolment Widget a new feature has been added to allow more control over which pages the Course list will direct to for the Course Details pages. Note this is Only available with the shortcode course list.
What the tool does is allow a Course to be paired with a Wordpress Page. This page will be considered the drilldown page / details page for that course, and be used in the course list over the default page.
This allows dedicated pages to be created for courses, allowing further control over SEO and other factors, and providing friendly URLS.

The Events Calendar Integration
The 2.8 Version of the Wordpress Plugin comes with an optional integration with The Events Calendar (free and paid versions). This integration creates "events" for upcoming Course Instances, allowing them to be utilised within The Events Calendar product family.
See the Help Section dedicated to The Events Calendar for more information.

Enroller Events
Enroller Events are actions taken on completion of an enrolment. Specifically they are a combination of Settings, Shortcodes and Triggers. They can be used in conjunction with other systems, such as Post Enrolment Events to enable complex enrolment processes.
See the Help Section dedicated to Enroller Events for more information.

Enrolment Resumption
Enrolment Resumption is a system by which students who have started, but not yet finished enrolments can resume their enrolment from the point at which they left the Enrolment Widget. It uses email notifications to the student that provide them with a URL which remains valid for two days.
See the Help Section dedicated to Enrolment Resumption for more information.

Post Enrolment System
The Post Enrolment System is designed to allow additional information to be captured after a student has been successfully enrolled into a course.
See the Help Section dedicated to the Post Enrolment System for more information.


== Changelog ==

= 3.13.3 =
* Resolved an issue where form submission for eWay would take longer than expected, resulting in the submit button becoming available again.

= 3.13.2 =
* Resolved an issue where the first payer step would not allow changing the payer with the appropriate settings.

= 3.13.1 =
* Resolved an issue for approval discounts where they would not apply to the invoice.

= 3.13.0 =
* New default field available for Commencing Program Cohort Identifiers (Vic)

= 3.12.0 =
* Significant changes have been made to the Payment Methods to support new Payment Gateways. The separate Ezypay Single Payment method has been deprecated, and is now available under the standard Credit Card method, based on account settings. No changes are required to support this, and existing payment methods will remain functional.
* Resolved an issue with notifications not being sent to the Training Administrator email under certain payment methods.
* A new setting Skip Full Instances is available for the Events Calendar Integration, that will not add instances that are full to the calendar.

= 3.11.1=
* Resolved an issue with the recent versions of the Events Calendar Plugin.

= 3.11.0=
* Resolved some warnings and deprecation messages from PHP 8+.
* Resolved an issue where the dedicated Address step would ignore unsaved changes and skip validation under some circumstances.
* The Enrolment configuration limit that previously applied only to empty configurations now also applies to new default configurations. A maximum of 50 configurations are permitted by the UI. Extra configurations will persist, but new configurations will not be permitted. This is to ensure that performance is not adversely affected and to ensure that the data can be persisted properly.
* Resolved an issue where removing a student from a group booking would fail.
* Addressed an issue where an error could occur when no menus had been set for the shopping cart when attempting to attach to menus.

= 3.10.0 =
* Improvements and changes have been made to the default configurations available for the enrolment form. This will not affect any existing forms.
* Added fallback support for the Google Places driven Address Step to load if the Places API library is not available.
* Eliminated warnings shown in debug mode when Course Duration - which is only available for Workshops - cannot be retrieved for a course.
* Improved how the enrolment form handles navigation events on completion of an enrolment. Additional checks are in place to ensure that all other functions complete before navigation commences.

= 3.9.0 =
* More detailed error messages will now be returned on failed enrolments. Errors such as missing invoice templates or other problems will now be visible to the end user.
* Resolved a compatibility issue with some websites running non-standard versions of jQuery.
* Overhauled all plugin settings to disable autoloading. This may result in site performance increases with large numbers of enrolment widgets.

= 3.8.1 =
* Resolved a compatibility issue with Wordpress 5.9+

= 3.8.0 =
* Resolved an issue that prevented registration form defaults from applying under certain enrolment scenarios.
* Increased the base API timeout to allow for enrolment into instances linked to many Assessment or ELearning activities.

= 3.7.0 =
* An additional custom message can be added to the Validate on Create / USI Verify message.
* An additional setting that removes the ability for the user to close the Existing Record Found message has been added. "Allow Validate On Create Close"
* Added support for Victorian reporting field Commenced While At School.
* Enquiries submitted relating to a course type will now contain the course details in the contact note and administrator email generated.
* Custom Fields imported from aXcelerate via the ‘Select a Default Field’ dropdown will now have their options synced with the values in aXcelerate by default. This can be disabled using the ‘Sync to custom field’ field setting.
* A new message will be displayed when an enrolment widget intended for enrolment is loaded without a way to specify a course, or a course already specified. This message is customisable through settings.
* Improved shard detection to no longer require the aXcelerate WebService User to have Settings permissions.
= 3.6.2 =
* Resolved an issue where custom shard domains would not send the user to app.axcelerate.com to login, rather than the shard.
= 3.6.1 =
* Updated the message displayed when a contact is identified on the Login step by Validate on Create/USI Verify. An obfuscated email will now be shown indicating the email address that has been sent the resumption link. Also, if the USI match setting is used, and the contact has no email address, a duplicate contact will be allowed.
* Resolved an issue with the complex course search and classes with no dates.
= 3.6.0 =
* Warnings generated by Enrolment Details/Options steps when changing values after having gone through the review step are now hidden by default. In most cases these warnings were triggered by group bookings, for which the warning was not applicable. Can be re-enabled through configuration.
* Checkbox custom fields that have spaces in the values will no longer cause errors - although they are still not recommended.
* A new setting to support capturing Parent Signatures into the Enrolment Info Capture system is now available. This will record the signature of a parent or guardian on the Billing/Enrolment step.
* A new setting is available to hide step terms from the Billing step contact note, as this information may now be captured through the Enrolment Info Capture PDF system.
* Enabled support for the new Ezypay Payment Plan mapping system added with the 2021.11.03 aXcelerate release. See aXcelerate release notes for more information with regards to using this feature. No configuration is needed on WordPress.
* Enforced a 20 character limit on the Purchase Order field.

= 3.5.2 =
* Resolved an issue that prevented the Contact Create popup from closing on creation under certain circumstances.
= 3.5.1 =
* Resolved an issue that caused the config id against a resumed enrolment to change as a result of failed payment.
= 3.5.0 =
* Global Login is now managed via cookies rather than PHP Sessions.
* Minor improvements to the NLE login/logout experience.
* Eway Shared Hosted Page (beta) - payment method. A new payment method that makes use of Eway's Shared Hosted page system. May not support approval discounts fully at this time.
* Resolved an error when processing a token based payment after cancelling/failing the first attempt at payment.
* Resolved an issue with duplicate Logout buttons when resuming an enrolment.
* Email debugging disabled by default, with a new setting to enable.

= 3.4.4 =
* Added a Logout button to the Enrolment form to allow selecting of a different contact after having signed in using NLE.
* Beta Support for Eway Responsive Shared Page, this payment method can be enabled in the Billing Step.
* Support for Multiple linked users via NLE logins. Users are able to choose which user to continue with.
* Subdomains will now be set once only. If your subdomain changes, you will need to update your settings within Wordpress to point to the new domain.

= 3.4.3 =
* Minor tweak to API Calls to better enable shard detection.

= 3.4.2 =
* Added a new option to enable hiding of the New Login Experience. This is not recommended.
* Added a new setting that enables support for Login only with a custom provider, mirroring options within aXcelerate when using SSO.

= 3.4.1 =
* Corrected an issue where the DatePicker in the enquiry widget may not load as expected, or be styled incorrectly due to specific themes.

= 3.4.0 = 
* Enable automatic support for New Login Experience for clients not currently using SSO.
* Corrected an issue with the Enquiry Widget and the Ignore Hidden Fields setting that may prevent submission of the form.
* Additional metadata is now added to a dataLayer javascript object on the Course Details page, for use with Google Tag Manager or similar analytics tools.
* Corrected an issue with the Complex Course Search, which could sometimes exclude results if too many course instances were located.

= 3.3.2 = 
* Disabled automatic Global Login when New Login Experience is not enabled.

= 3.3.0 = 
* Support for the New Login Experience - https://www.axcelerate.com.au/heartbeat/a-new-login-experience. This can be enabled against supported environments via the Cognito Auth 2.0 setting in the Cognito Settings area.

= 3.2.2 = 
* Corrected an issue where the payment_tentative setting would not apply if an enrolment was confirmed via webhook before the student reached the thank you page.

= 3.2.1 = 
* Resolved an issue which prevented completing payment plan enrolments with a terms checkbox.

= 3.2.0 = 
* Improvements have been made to how the course instance list handles empty whitespace / empty elements.
* Email Notifications for Resumption / Contact Verification will now add the selected template note type, instead of system note.
* Removed some duplication of content in contact notes generated when enrolling.
* Corrected an issue preventing Agent users from being able to update contacts which were returned from searching in the contact-search step.

= 3.1.2 =
* Minor update to urls used when a shard domain is detected.

= 3.1.1 =
* Resolved a compatibility issue with the datepicker in the Enrolment form and Elementor.

= 3.1.0 =
* Portfolio Upload no longer needs to generate a user account to upload. Note Upload is now working through a new mechanism so there may be some changes to allowed files / compatibility issues with less widely used browsers.
* Resolved an issue with the datepicker on the USI Validate step.
* Privacy notices in default configurations have been updated. Existing forms will not be modified.
* Resolved some console errors in the Google Places address step which did not affect functionality.
* Resolved an issue where Study reason was not captured in the Enrolment Info Capture system.
* Resolved an issue with the Payment Tentative setting not applying to certain payment gateways.
* Resolved some compatibility issues with sites running legacy jQuery.

= 3.0.4 =
* Resolved a compatibility issue affecting Enrolment form Layout with some sites still running on WordPress versions below 5.6 and older versions of jQuery.

= 3.0.3 =
* Resolved issues with datepickers resetting when resuming / changing steps.
* Resolved an issue with alerts not having a background when attempting to enrol the same contact a second time.

= 3.0.2 =
* Resolved an issue with portfolio upload.

= 3.0.1 =
* This major release is primarily aimed at updating the plugin to fully support the Wordpress jQuery version update and subsequent jQuery Migrate removal.
* In order to maintain ongoing compatibility, the jQuery Mobile dependency has been removed. This has necessitated some changes to the Enrolment/Enquiry forms that may result in incompatibility with CSS overrides.
* These changes were necessary as both part of the upgrade, to simplify ongoing maintenance of the plugin and to allow more easy customisation going forwards. They also resolve a number of theme compatibility issues identified as well as correcting some outstanding styling issues. 
* After updating we recommend you test your enrolment forms and look for any styling / layout issues. If any are found we would recommend you remove all custom CSS and add back only what is required, as some changes may have eliminated the need for previous theme compatibility adjustments/changes.

= 2.9.21 =
* Corrected an issue where certain field data was being removed from notes generated via enquiries.

= 2.9.20.2 =
* Corrected an issue which sometimes resulted in caching settings being unavailable on plugin load.

= 2.9.20 =
* Resolved an issue where dates could sometimes be formatted strangely based on end user timezone settings.
* A new setting (Enrolment Info Capture) has been created in the which will generate an enrolment document containing information about a student at the point of enrolment. This document will then be stored against the student’s portfolio.
* Added functionality to portfolio checklist mapping to overwrite the top blurb with the intention of allowing specific documents to be served in the enrolment form.
* Corrected an issue which caused formatting problems when using the No Instance Message setting for course instance list.


= 2.9.19.1 =
* Resolved an issue affecting alerts in the enroller widget on some sites that prevented them from being closed.

= 2.9.19 = 
* Added additional controls to differentiate between preventing Student Notifications and Admin Notifications on enrolment.
* Updated the Enquiry Widget to support adding a contact category to a contact.
* Added new empty state options for empty course instance lists.
* Corrected an issue which would sometimes result in dynamic steps, such as the Address Step, not being marked as required.
* Updated various default configurations and field settings for the Enrolment widget configurations.
* Updated the Enquiry Widget to support different wording on the Enquire button.
* Added the ability to scroll within overly long terms and conditions blocks.
* Added support for mapping between Enrolment Configurations, Courses and specific portfolio checklists. This allows specific portfolio checklists to be loaded based on the course chosen, without needing many configurations.

= 2.9.18.3 = 
* Resolved an issue preventing contact sources from being returned.

= 2.9.18.2 = 
* Corrected an issue where unexpected delays in UI updates could cause checkboxes to throw an error when updating fields.

= 2.9.18 =

* Added support for new Approval system for discounts (Only available with eWay Rapid) where the discount needs to be approved in aXcelerate before payment is taken.
* Added a new attribute "date_format" to date shortcodes (ax_course_instance_startdate, ax_course_instance_finishdate) to allow custom formatting of dates. See https://www.php.net/manual/en/datetime.format.php for supported date format rules.
* Auto updates through Wordpress's auto-update system are now supported.
* Course Cost and Duration are now available as shortcodes that can be used in the course list and course details.
* An option has been added to the course list when using the ax-tile style to allow the entire tile area to be clickable to direct to the course details page.
* The excluded_courses parameter has been added to the course list shortcode. This will allow the course list to be filtered by a list of course IDs. The placeholder "selected_course" can also be used in the excluded courses parameter to filter out the currently selected course if the list is embedded in a course details block.


= 2.9.17 =

* Resolved a security permission warning that was added in WP 5.5 to the Rest API.
* Optional portfolio steps now allow the user to click the continue button, rather than requiring navigation via the step menu.
* Replaced legacy usage of array_key_exists to comply with PHP 7.4+ deprecation.

= 2.9.16 =

* Corrected an issue with some payment methods and the suppress notifications setting.
* Updated the jQuery Mobile library used to catch errors thrown from WooCommerce which were causing issues with loading the Enrolment Widget.
* Corrected an issue which would incorrectly flag steps as having changes when Dropdowns were on the step.
* Support for using Ezypay's new hosted payment form as a payment method.

= 2.9.15 =

* New Enrolment Setting: Send Data for Hidden Fields. Prevents hidden fields from blocking step completion if required, and allows capture of data set to hidden fields via copy / other events.
* New Setting: Unique Emails. A global setting for all enrolment configurations, this setting will enforce that every student being enrolled has a unique email address for the enrolment session. Setting is On by default.


= 2.9.14 =

* New Enrolment Setting: Promo-Code Per Course - which when used with the lock promo code setting will track promo codes on a course basis.
* New Enrolment Setting: New User USI Validate - when used in conjunction with contact-validation will display a USI and DOB field on the New User step. This will validate and search for an existing contact with the USI. That contact will get an email to resume the enrolment process.
* Corrected an issue with drop down fields in the Enquiry Widget on iPhones
* Improvements have been made to the ax_course_instance_list shortcode ordering
* The Complex Course Search Tool will now also have a state filter option
* Support for the upcoming subdomain/shard feature.
* Improvements to the error handling if table upgrades are run while the table is actively being queried.


= 2.9.13 =

* The complex course search will now page searches with many instances - This will result in more updates to let the student know it is loading
* A new option is available on the complex course search that will prevent the initial search from firing, until someone hits the search button.
* Added additional constraints to handle unexpectedly long redirects when submitting the payment form. 

= 2.9.12 =

* Added additional features to the Ezypay plan step, to now support alternate payment methods.
* Added support for custom aXcelerate domains
* Added an option to hide fully booked courses from the Complex Course Search. This will default to true.


= 2.9.11 =

* Corrected an issue where certain characters in a file name would prevent uploads via the portfolio step
* Allowed the USI Verification step to be set to non mandatory
* Corrected an issue with the display of signature fields when they initially start out hidden.

= 2.9.10.3 =

* Added an option to return to using the Wordpress Transient system for clients who are unable to enable database table creation.

= 2.9.10.2 =

* Added a check to the Events Calendar process to clean up any duplicate events.

= 2.9.10.1 = 

* Corrected an issue resulting in duplication of events in the Events Calendar integration, on the first run.

= 2.9.10 =

* The Ezypay plan step now supports multiple courses.
* Updated the plugin update system to prevent issues with future php versions.
* New setting to add Credit Transfers when enrolling students - if they would get them when enrolling in aXcelerate
* Default configurations for enrolment updated to reflect changing AVETMISS requirements.
* Corrected an issue with tooltips on mobile devices
* Custom fields defined in aXcelerate are now available for selection in the config builder
* The Wordpress Transient system is no longer being used due to inconsistent expirations.
* Post Enrolment forms can now be correctly nested in thank you pages with all payment gateways
* All payment gateways now work with all redirect settings for enrol events
* Default page templates for ithe instance list have been updated


= 2.9.09 =

* Enrolments made through the Ezypay payment gateway will now have subscription details recorded in the enrolment contact note.
* Terms and conditions in the Billing step will now be recorded in the enrolment contact note.
* New options for resumption templates have been made available, based on the type of resumption and config.
* A new step type is available for Ezypay enrolments, when guided by an Admin. Contact aXcelerate to implement this step.
* ABN can now be set as mandatory in the Review step, if the payer has an organisation.


== Upgrade Notice ==

= 3.4.0 =
Required for New Login Experience

== Arbitrary section ==
