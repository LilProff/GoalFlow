import httpx, asyncio

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post('http://localhost:8000/auth/login', json={'email':'samuel@test.com','password':'Test1234!'})
        print('Login:', r.status_code)
        token = r.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        print('\n=== All Endpoints ===')
        endpoints = [
            ('GET', '/health'),
            ('GET', '/user/me'),
            ('GET', '/user/stats'),
            ('GET', '/pillars/'),
            ('GET', '/pillars/stats'),
            ('GET', '/daily/today'),
            ('GET', '/daily/streak'),
            ('GET', '/daily/history?days=7'),
            ('GET', '/tasks/today'),
            ('POST', '/tasks/create', {'pillar_id': 'BUILD', 'title': 'Final Task'}),
            ('POST', '/daily/log', {'build_hours': 4.0, 'reflection': {'accomplished': 'Done'}}),
        ]

        for method, path, *body in endpoints:
            if method == 'GET':
                r = await client.get(f'http://localhost:8000{path}', headers=headers)
            else:
                r = await client.post(f'http://localhost:8000{path}', json=body[0], headers=headers)
            ok = r.status_code in (200, 201)
            status_str = "OK" if ok else "FAIL"
            print(f'{path}: {r.status_code} {status_str}')

asyncio.run(test())