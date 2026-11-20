"""Derived placement labels must follow the offer lifecycle, without new columns."""
from unittest.mock import patch

import pytest


@pytest.mark.parametrize('outcomes,offers,status,expected', [
    (['Pass', 'Pass'], [], 'Shortlisted', 'Ready for offer'),
    (['Pass', None], [], 'Shortlisted', 'Shortlisted'),
    (['Pass', 'On-Hold'], [], 'Shortlisted', 'Shortlisted'),
    (['Pass', 'Fail'], [], 'Rejected', 'Rejected'),
    ([], [], 'Applied', 'Applied'),
    (['Pass'], [{'offer_status': 'Pending'}], 'Shortlisted', 'Offer received'),
    (['Pass'], [{'offer_status': 'Accepted'}], 'Shortlisted', 'Placed'),
    (['Pass'], [{'offer_status': 'Declined'}], 'Shortlisted', 'Offer declined'),
    (['Pass'], [], 'Withdrawn', 'Withdrawn'),
])
def test_student_application_stage(client, student_headers, outcomes, offers, status, expected):
    application = {'drive_id': 3, 'status': status}
    rounds = [{'outcome': outcome} for outcome in outcomes]
    with patch('routes.student_routes.query', side_effect=[[application], rounds, offers]):
        response = client.get('/api/student/applications', headers=student_headers)
        assert response.status_code == 200
        assert response.json['applications'][0]['placement_stage'] == expected
