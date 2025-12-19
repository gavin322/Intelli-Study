import urllib.request

local_levels = {
    'lexicon_kindergarten': {
        'description': '幼儿园基础词',
        'words': [
            ('apple', '苹果'), ('dog', '狗'), ('cat', '猫'), ('ball', '球'), ('run', '跑'),
            ('jump', '跳'), ('red', '红色'), ('blue', '蓝色'), ('mom', '妈妈'), ('dad', '爸爸'),
            ('book', '书'), ('happy', '开心'), ('sad', '难过'), ('hot', '热'), ('cold', '冷')
        ]
    },
    'lexicon_elementary': {
        'description': '小学常见词',
        'words': [
            ('school', '学校'), ('teacher', '老师'), ('friend', '朋友'), ('study', '学习'), ('learn', '学习'),
            ('breakfast', '早餐'), ('lunch', '午餐'), ('homework', '作业'), ('family', '家庭'), ('music', '音乐'),
            ('library', '图书馆'), ('computer', '电脑'), ('playground', '操场'), ('river', '河流'), ('mountain', '山')
        ]
    }
}

remote_levels = {
    'lexicon_middle': {
        'description': '初中进阶（SAT 起步）',
        'url': 'https://raw.githubusercontent.com/teropa/nlp/master/resources/vocabulary/sat.txt'
    },
    'lexicon_high': {
        'description': '高中强化（SAT 核心）',
        'url': 'https://raw.githubusercontent.com/teropa/nlp/master/resources/vocabulary/sat.txt'
    },
    'lexicon_college': {
        'description': '大学/考研（GRE 核心）',
        'url': 'https://raw.githubusercontent.com/teropa/nlp/master/resources/vocabulary/gre.txt'
    }
}

def escape(s: str) -> str:
    return s.replace("'", "''")

sql_lines = ["SET client_encoding = 'UTF8';"]

for name, meta in local_levels.items():
    sql_lines.append(f"INSERT INTO \"LexiconSource\"(id, name, description, type) VALUES (gen_random_uuid(), '{name}', '{escape(meta['description'])}', '{name}') ON CONFLICT (name) DO NOTHING;")
    for text, cn in meta['words']:
        sql_lines.append(
            f"INSERT INTO \"Word\"(id, text, translation, \"partOfSpeech\", example, \"sourceId\") VALUES (gen_random_uuid(), '{escape(text)}', '{escape(cn)}', NULL, NULL, (SELECT id FROM \"LexiconSource\" WHERE name='{name}')) ON CONFLICT (text) DO NOTHING;"
        )

for name, meta in remote_levels.items():
    sql_lines.append(f"INSERT INTO \"LexiconSource\"(id, name, description, type) VALUES (gen_random_uuid(), '{name}', '{escape(meta['description'])}', '{name}') ON CONFLICT (name) DO NOTHING;")
    try:
        with urllib.request.urlopen(meta['url'], timeout=30) as resp:
            data = resp.read().decode('utf-8')
            words = [w.strip() for w in data.splitlines() if w.strip() and w[0].isalpha()]
    except Exception as e:
        print(f'failed to fetch {name}: {e}', flush=True)
        words = []
    for text in words:
        sql_lines.append(
            f"INSERT INTO \"Word\"(id, text, translation, \"partOfSpeech\", example, \"sourceId\") VALUES (gen_random_uuid(), '{escape(text.lower())}', '', NULL, NULL, (SELECT id FROM \"LexiconSource\" WHERE name='{name}')) ON CONFLICT (text) DO NOTHING;"
        )

with open('lexicon_import.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))
print('lexicon_import.sql written, lines:', len(sql_lines))