import re
import json
from pymongo import MongoClient
from typing import Dict, Text, Any, List, Union, Optional

from rasa_sdk import Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.forms import FormAction, FormValidationAction
from rasa_sdk import Action
from rasa_sdk.events import SlotSet
from rasa_sdk.events import FollowupAction
from rasa_sdk.events import AllSlotsReset
from rasa_sdk.types import DomainDict

from functions import *

client = MongoClient("localhost", 27017)
db = client["chatbot"]
db.authenticate("bot", "password")

APPLICATION = "veeva"
REQUESTED_SLOT = "requested_slot"
ACCESS_FORM_SLOTS = ["application", "subsystem", "role", "line_manager", "muid", "email"]
CONFIG = next(db.country_config.find({"application": APPLICATION}))


class AccessForm(FormAction):
    def name(self):
        return "access_form"

    def required_slots(self, tracker) -> List[Text]:
        return ACCESS_FORM_SLOTS

    def slot_mappings(self) -> Dict[Text, Union[Dict, List[Dict]]]:
        return {"application": [self.from_text()], "subsystem": [self.from_text()], "role": [self.from_text()],
                "line_manager": [self.from_text()], "muid": [self.from_text()], "email": [self.from_text()]}

    def request_next_slot(self, dispatcher, tracker, domain):
        for slot in self.required_slots(tracker):
            if self._should_request_slot(tracker, slot):
                kwargs = {}
                if slot in ACCESS_FORM_SLOTS:
                    message = CONFIG['responses']['request_' + slot]["text"]
                    if 'buttons' in CONFIG['responses']['request_' + slot].keys():
                        buttons = CONFIG['responses']['request_' + slot]["buttons"]
                    else:
                        buttons = []
                    dispatcher.utter_message(message, buttons=buttons)
                else:
                    dispatcher.utter_template("utter_ask_{}".format(slot), tracker, **kwargs)

                return [SlotSet(REQUESTED_SLOT, slot)]

    # def validate_line_manager(self, slot_value: Any, dispatcher: CollectingDispatcher, tracker: Tracker, domain: DomainDict,) -> Dict[Text, Any]:
    #	line_manager = tracker.get_slot('line_manager')
    #	if len(re.findall(r'[\w\.-]+@[\w\.-]+(?:\.[\w]+)+', str(line_manager))) > 0:
    #		return {"line_manager" : line_manager}
    #	else:
    #	dispatcher.utter_message("Entered email id is invalid.")
    #	return {"line_manager" : None}

    def submit(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict]:
        rvalue = []
        if tracker.latest_message.get('text') == '/reset_chat':
            rvalue = [FollowupAction('action_reset_chat')]
        else:
            insert_request(tracker, "access_form")
            dispatcher.utter_message(CONFIG['responses']['training_information']["text"])
        return rvalue


class ActionResetChat(Action):
    def name(self) -> Text:
        return "action_reset_chat"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(template="utter_get_started")
        return [AllSlotsReset()]


class ActionAcceptDeny(Action):
    """Triggered for intent accept or deny. will select the follow action based on product slot"""
    def name(self) -> Text:
        return "action_accept_deny"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        if tracker.get_slot('open_request'):
            if tracker.latest_message['intent'].get('name') == 'deny':
                dispatcher.utter_message('You can continue your request by typing "Open Requests".')
            else:
                response = check_status(CONFIG)
                message = CONFIG['responses'][response]["text"]
                if 'buttons' in CONFIG['responses'][response].keys():
                    buttons = CONFIG['responses'][response]["buttons"]
                else:
                    buttons = []
                dispatcher.utter_message(message, buttons=buttons)
        else:
            if tracker.latest_message['intent'].get('name') == 'deny':
                dispatcher.utter_message('You can continue your request by typing "Open Requests".')
            else:
                request_details = fetch_open_request('aravind.raju@external.merckgroup.com')
                if request_details['state'] == 'trained':
                    initiate_form(CONFIG)
                    dispatcher.utter_message(CONFIG['responses']['template_triggered']["text"])

        return [SlotSet('open_request', False)]


class ActionOpenRequest(Action):

    def name(self) -> Text:
        return "action_open_request"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        request_details = fetch_open_request("aravind.raju@external.merckgroup.com")
        if request_details:
            message = CONFIG['responses']['open_request']["text"]
            buttons = CONFIG['responses']['open_request']["buttons"]
            dispatcher.utter_message(message, buttons=buttons)
        else:
            dispatcher.utter_message(CONFIG['responses']['no_open_request']["text"])
        return [SlotSet('open_request', True)]
