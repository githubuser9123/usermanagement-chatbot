import json
import uuid
import requests
from io import StringIO
import pandas as pd
from requests.auth import HTTPBasicAuth
from pymongo import MongoClient

client = MongoClient("localhost", 27017)
db = client["chatbot"]


def hr4u_auth(config):
    headers = {"Content-Type": "application/json"}
    service_answer = requests.post(config['auth_hr4u_url'], headers=headers,
                                   auth=HTTPBasicAuth(username=config['user_name'], password=config['password']),
                                   data=json.dumps(config['hr4u_circulum_data']))
    service_json = service_answer.json()
    headers["Authorization"] = "Bearer {}".format(service_json.get("access_token"))
    return headers


def checking_training_status(config, user_id, curriculum_id="DEV0401"):
    training_status = None
    headers = hr4u_auth(config)
    url = config['hr4u_url'] + "$filter=criteria/userID eq '{}'".format(user_id)
    curriculum_data = requests.get(url=url, headers=headers)
    df = pd.DataFrame.from_dict(curriculum_data.json()["value"], orient='columns')
    df = df[df["curriculumID"] == curriculum_id]
    if not df.empty:
        training_status = df["curriculumStatus"].iloc[0]

    return training_status


def fetch_open_request(email):
    return list(db['requests'].find({"status": "Open", "email": email}))[0]


def insert_request(tracker, state):
    request_details = {
        'request_id': uuid.uuid4().hex,
        'muid': tracker.get_slot('muid'),
        'line_manager': tracker.get_slot('line_manager'),
        'application': tracker.get_slot('application'),
        'subsystem': tracker.get_slot('subsystem'),
        'role': tracker.get_slot('role'),
        'email': tracker.get_slot('email'),
        'state': state,
        'status': 'Open',
        "request_type": "access"
    }

    db['requests'].insert_one(request_details)


def initiate_form(config):
    request_details = fetch_open_request('aravind.raju@external.merckgroup.com')
    payload = json.dumps({
        "fileInfos": [{"libraryDocumentId": "CBJCHBCAABAAtMoVbTFGqlw9RUaNN72StfALTCbGEVz_"}],
        "name": "Veeva Access Request",
        "participantSetsInfo": [{
            "memberInfos": [{"email": request_details['email']}], "order": 1, "role": "FORM_FILLER"},
            {"memberInfos": [{"email": request_details['line_manager']}], "order": 2, "role": "SIGNER"}],
        "signatureType": "ESIGN",
        "state": "IN_PROCESS"
    })
    headers = {'Content-Type': 'application/json', 'authorization': 'Bearer {0}'.format(config['esign_key'])}
    response = requests.request("POST", config['esign_agreement_url'], headers=headers, data=payload)
    update_request(request_details['request_id'], 'agreement_id', response.json()['id'])


def check_esignform_status(config, agreement_id):
    status = False
    headers = {
        'authorization': 'Bearer ' + config['esign_key'],
        'content-type': 'application/json'
    }
    response = requests.request("GET", '{0}/{1}'.format(config['esign_agreement_url'], agreement_id), headers=headers, data={})
    if response.json()['status'] == 'SIGNED':
        status = True
    return status


def update_request(request_id, key, value):
    db.requests.update({"request_id": request_id}, {'$set': {key: value}})


def check_status(config):
    response = ''
    request_details = fetch_open_request('aravind.raju@external.merckgroup.com')
    if request_details['state'] == 'access_form':
        training_status = checking_training_status(config, request_details['muid'], 'R&D - Merck Policy - 18')
        if training_status == 'Y':
            response = 'training_completed'
            update_request(request_details['request_id'], 'state', 'trained')
        elif training_status == 'N':
            response = 'training_inprogress'
        else:
            response = 'api_issue'
    elif request_details['state'] == 'trained':
        if 'agreement_id' in request_details.keys():
            if check_esignform_status(config, request_details['agreement_id']):
                create_user(config, request_details)
                if create_user:
                    response = 'create_user'
                else:
                    response = 'api_failure'
            else:
                response = 'approval_inprogress'
        else:
            initiate_form(config)
            response = 'template_triggered'
    return response


def get_formdata(config, agreement_id):
    url = '{0}/{1}/formData'.format(config['esign_agreement_url'], agreement_id)
    headers = {'Authorization': 'Bearer ' + config['esign_key']}
    response = requests.request("GET", url, headers=headers, data={})
    StringData = StringIO(response.text)
    df = pd.read_csv(StringData)
    return df[df.role == 'FORM_FILLER']


def create_user(config, request_details):
    status = True
    payload = 'username={0}&password={1}'.format(config['veeva_username'], config['veeva_password'])
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    response = requests.request("POST", config['veeva_auth_url'], headers=headers, data=payload)
    session_id = response.json()['sessionId']
    df = get_formdata(config, request_details['agreement_id'])
    username = df.username.iloc[0]
    firstname = df.first_name.iloc[0]
    lastname = df.last_name.iloc[0]
    user_language = df.user_language.iloc[0]
    user_timezone = df.user_timezone.iloc[0]
    create_ticket(df, request_details, config)
    security_profile = config['security_profile'][request_details['role']]
    payload = 'user_name__v={0}@sb-merckgroup.com&user_first_name__v={1}&user_last_name__v={2}&user_email__v={3}&user_timezone__v={4}&user_locale__v=en_IN&security_policy_id__v=3829&user_language__v=en&security_profile__v={6}&license_type__v=full__v'.format(username, firstname, lastname, request_details['email'], user_timezone, user_language, security_profile)
    headers = {'Authorization': session_id, 'Content-Type': 'application/x-www-form-urlencoded'}
    response = requests.request("POST", config['veeva_createuser_url'], headers=headers, data=payload)
    if response.json()['responseStatus'] != "SUCCESS":
        status = False
    else:
        update_request(request_details['request_id'], 'status', 'Closed')
    return status


def create_ticket(formdata, request_details, config):
    headers = hr4u_auth(config)
    username = formdata.username.iloc[0]
    firstname = formdata.first_name.iloc[0]
    lastname = formdata.last_name.iloc[0]
    user_language = formdata.user_language.iloc[0]
    user_timezone = formdata.user_timezone.iloc[0]
    snow_params = {
        'short_description': 'Veeva Access - {0}'.format(request_details['muid']),
        'description': 'username: {0}\nfirst name: {1}\nlast name: {2}\nuser language: {3}\nuser language: {4}\nuser timezone: {5}\nrole: {6}'.format(username, firstname, lastname, request_details['email'], user_timezone, user_language, request_details['role']),
        'pdi': 'PDI010000',
        'affected_user': 'X217222'
    }
    response = requests.post(config['snow_url'], headers=headers,
                auth=HTTPBasicAuth(username=config["snow_username"], password=config["snow_password"]), params=snow_params)
    update_request(request_details['request_id'], 'ticket_number', response.json()["result"])
