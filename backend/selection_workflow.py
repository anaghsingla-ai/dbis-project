"""Connect company selection to an offer using existing T4 and T5 procedures."""
from db import query, call_procedure, DatabaseException


def grant_offer(student_id, drive_id):
    existing = query('SELECT offer_id, offer_status FROM Offer WHERE student_id = %s AND drive_id = %s', (student_id, drive_id))
    if existing:
        if existing[0]['offer_status'] == 'Declined':
            raise DatabaseException({'message': 'This offer was already declined and cannot be granted again.', 'status_code': 422, 'code': 1644, 'sqlState': '45000', 'raw': ''})
        return existing[0]
    result = call_procedure('sp_issue_offer', [student_id, drive_id])
    return {'offer_id': result[0]['offer_id'], 'offer_status': 'Pending'}


def record_result(student_id, round_id, outcome, score, remarks):
    result = call_procedure('sp_record_round_result', [student_id, round_id, outcome, score, remarks])
    response = {'success': True, 'message': 'Round result saved.', 'data': result[0] if result else None}
    if outcome != 'Pass':
        return response
    rounds = query('''SELECT sr.drive_id,
        NOT EXISTS(SELECT 1 FROM Selection_Round later
            WHERE later.drive_id = sr.drive_id AND later.round_no > sr.round_no) AS is_final
        FROM Selection_Round sr WHERE sr.round_id = %s''', (round_id,))
    if not rounds or not rounds[0]['is_final']:
        return response
    try:
        offer = grant_offer(student_id, rounds[0]['drive_id'])
        response.update(offer=offer, message='Candidate selected! The offer is now available in the student My Offers page.')
    except DatabaseException as error:
        # T4 and T5 remain separate transactions. Report allocation failure clearly,
        # retaining the result and allowing the company to retry Grant Offer.
        response.update(warning=True, message=f'Final round passed, but the offer could not be issued: {error}. Use Grant Offer after resolving this.')
    return response
