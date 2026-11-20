"""Round creation API checks without a running database or schema changes."""
from unittest.mock import patch

import pytest

from db import DatabaseException


VALID_ROUND = {
    'drive_id': 3,
    'round_no': 1,
    'round_type': 'Technical Interview',
    'round_date': '2026-12-01',
    'mode': 'Virtual',
    'venue': 'Meeting link',
}


@pytest.mark.parametrize('field,value', [
    ('round_no', 0), ('round_no', -1), ('round_no', 1.5),
    ('round_no', None), ('round_no', True), ('drive_id', ''),
    ('round_type', 'Invalid round'), ('mode', 'Invalid mode'),
    ('round_date', '2026-02-30'), ('round_date', 123),
    ('venue', 'x' * 151),
])
def test_invalid_round_does_not_write(client, admin_headers, field, value):
    with patch('routes.admin_routes.query') as query, patch('routes.admin_routes.execute') as execute:
        response = client.post('/api/admin/rounds', json={**VALID_ROUND, field: value}, headers=admin_headers)
        assert response.status_code == 400
        assert response.json['success'] is False
        query.assert_not_called()
        execute.assert_not_called()


def test_create_round_preserves_selected_details(client, admin_headers):
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], [], [{'started': 0, 'offered': 0}]]), \
            patch('routes.admin_routes.execute', return_value={'last_id': 42}) as execute:
        response = client.post('/api/admin/rounds', json=VALID_ROUND, headers=admin_headers)
        assert response.status_code == 200
        assert response.json['round_id'] == 42
        assert execute.call_args.args[1] == (3, 1, 'Technical Interview', '2026-12-01', 'Virtual', 'Meeting link')


def test_optional_round_date_and_venue(client, admin_headers):
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], [], [{'started': 0, 'offered': 0}]]), \
            patch('routes.admin_routes.execute', return_value={'last_id': 42}) as execute:
        response = client.post('/api/admin/rounds', json={**VALID_ROUND, 'round_date': '', 'venue': ''}, headers=admin_headers)
        assert response.status_code == 200
        assert execute.call_args.args[1][3] is None
        assert execute.call_args.args[1][5] is None


def test_missing_drive_does_not_write(client, admin_headers):
    with patch('routes.admin_routes.query', return_value=[]), patch('routes.admin_routes.execute') as execute:
        response = client.post('/api/admin/rounds', json=VALID_ROUND, headers=admin_headers)
        assert response.status_code == 404
        execute.assert_not_called()


def test_duplicate_round_returns_clear_conflict(client, admin_headers):
    error = DatabaseException({
        'message': 'A round with this round number already exists for this drive.',
        'status_code': 409, 'code': 1062, 'sqlState': '23000', 'raw': 'duplicate round',
    })
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], [], [{'started': 0, 'offered': 0}]]), \
            patch('routes.admin_routes.execute', side_effect=error):
        response = client.post('/api/admin/rounds', json=VALID_ROUND, headers=admin_headers)
        assert response.status_code == 409
        assert 'already exists' in response.json['message']


@pytest.mark.parametrize('rounds,activity,number,kind,message', [
    ([{'round_no': n, 'round_type': 'Aptitude Test'} for n in range(1, 5)], {'started': 0, 'offered': 0}, 5, 'HR Interview', 'at most 4'),
    ([{'round_no': 1, 'round_type': 'HR Interview'}], {'started': 0, 'offered': 0}, 2, 'GD', 'final round'),
    ([{'round_no': 1, 'round_type': 'Aptitude Test'}], {'started': 1, 'offered': 0}, 2, 'GD', 'locked'),
    ([{'round_no': 1, 'round_type': 'Aptitude Test'}], {'started': 0, 'offered': 1}, 2, 'GD', 'locked'),
    ([], {'started': 0, 'offered': 0}, 3, 'GD', 'must be 1'),
    ([{'round_no': 1, 'round_type': 'Aptitude Test'}], {'started': 0, 'offered': 0}, 2, 'Aptitude Test', 'already configured'),
    ([{'round_no': 1, 'round_type': 'Aptitude Test'}, {'round_no': 2, 'round_type': 'GD'}, {'round_no': 3, 'round_type': 'Technical Interview'}], {'started': 0, 'offered': 0}, 4, 'GD', 'already configured'),
])
def test_round_sequence_guards(client, admin_headers, rounds, activity, number, kind, message):
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], rounds, [activity]]), patch('routes.admin_routes.execute') as execute:
        response = client.post('/api/admin/rounds', json={**VALID_ROUND, 'round_no': number, 'round_type': kind}, headers=admin_headers)
        assert response.status_code in (400, 409)
        assert message in response.json['message']
        execute.assert_not_called()


def test_fourth_hr_round_finishes_sequence(client, admin_headers):
    rounds = [{'round_no': 1, 'round_type': 'Aptitude Test'}, {'round_no': 2, 'round_type': 'GD'}, {'round_no': 3, 'round_type': 'Technical Interview'}]
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], rounds, [{'started': 0, 'offered': 0}]]), patch('routes.admin_routes.execute', return_value={'last_id': 42}):
        response = client.post('/api/admin/rounds', json={**VALID_ROUND, 'round_no': 4, 'round_type': 'HR Interview'}, headers=admin_headers)
        assert response.status_code == 200


@pytest.mark.parametrize('rounds', [[], [{'round_no': 1, 'round_type': 'Technical Interview'}]])
def test_hr_can_finish_after_one_or_two_rounds(client, admin_headers, rounds):
    with patch('routes.admin_routes.query', side_effect=[[{'drive_id': 3}], rounds, [{'started': 0, 'offered': 0}]]), patch('routes.admin_routes.execute', return_value={'last_id': 42}):
        response = client.post('/api/admin/rounds', json={**VALID_ROUND, 'round_no': len(rounds) + 1, 'round_type': 'HR Interview'}, headers=admin_headers)
        assert response.status_code == 200
