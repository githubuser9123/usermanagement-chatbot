
user_name = "merckk-sbx"
password = "d631972765e9f073504ee0b97e0af7eb9287c725c811331e0e8a45dc9fe1cc5b43f3c85d8c517ab99c7503e2235ac5cc"
post_training_url = "https://merckk-sandbox.plateau.com/learning/oauth-api/rest/v1/token"
get_training_url = "https://merckk-sandbox.plateau.com/learning/odatav4/public/admin/curriculum-service/v1/UserCurriculumStatuses?"

#snow api url
snow_url = "https://wind.service-now.com/api/x_mkgaa_gti/gti_rest/create_request?"

hr4u_circulum_data = {
    "grant_type": "client_credentials",
    "scope":
        {
            "userId": "S115966",
            "companyId": "merckk-sbx",
            "userType": "admin",
            "resourceType": "learning_public_api"
        }
}

snow_params = {
    'short_description':'This is a test short description',
    'description':'This is a test description',
    'pdi':'PDI010000',
    'affected_user':'X217222'
}

