from unittest.mock import patch

import pytest

from auth import create_access_token
from db import DatabaseException
from selection_workflow import record_result, grant_offer


@pytest.mark.parametrize('outcome,is_final,issues_offer', [('Pass', 1, True), ('Pass', 0, False), ('Fail', 1, False), ('On-Hold', 1, False)])
def test_only_final_approval_grants_offer(outcome, is_final, issues_offer):
    with patch('selection_workflow.call_procedure', return_value=[{'result': 'saved'}]) as call, \
            patch('selection_workflow.query', return_value=[{'drive_id': 3, 'is_final': is_final}]), \
            patch('selection_workflow.grant_offer', return_value={'offer_id': 8, 'offer_status': 'Pending'}) as grant:
        response = record_result(1, 2, outcome, 0, None)
        assert response['success']
        call.assert_called_once_with('sp_record_round_result', [1, 2, outcome, 0, None])
        assert grant.called == issues_offer
        if issues_offer:
            assert response['offer']['offer_id'] == 8


def test_offer_failure_reports_saved_result_and_retry():
    error = DatabaseException({'message': 'All vacancies filled', 'status_code': 422, 'code': 1644, 'sqlState': '45000', 'raw': ''})
    with patch('selection_workflow.call_procedure', return_value=[{'result': 'saved'}]), \
            patch('selection_workflow.query', return_value=[{'drive_id': 3, 'is_final': 1}]), \
            patch('selection_workflow.grant_offer', side_effect=error):
        response = record_result(1, 2, 'Pass', 90, None)
        assert response['warning']
        assert 'All vacancies filled' in response['message']
        assert 'Grant Offer' in response['message']


def test_existing_offer_is_not_duplicated():
    with patch('selection_workflow.query', return_value=[{'offer_id': 8, 'offer_status': 'Pending'}]), patch('selection_workflow.call_procedure') as call:
        assert grant_offer(1, 3)['offer_id'] == 8
        call.assert_not_called()


def test_new_offer_uses_existing_t5():
    with patch('selection_workflow.query', return_value=[]), patch('selection_workflow.call_procedure', return_value=[{'offer_id': 8}]) as call:
        assert grant_offer(1, 3) == {'offer_id': 8, 'offer_status': 'Pending'}
        call.assert_called_once_with('sp_issue_offer', [1, 3])


@pytest.mark.parametrize('allowed', [True, False])
def test_company_can_only_select_its_own_candidates(client, allowed):
    token = create_access_token({'role': 'COMPANY_HR', 'company_id': 7})
    with patch('routes.hr_routes.query', return_value=[{'drive_id': 3}] if allowed else []), \
            patch('routes.hr_routes.grant_offer', return_value={'offer_id': 8}) as grant:
        response = client.post('/api/hr/offers', json={'student_id': 1, 'drive_id': 3}, headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == (200 if allowed else 403)
        assert grant.called == allowed
