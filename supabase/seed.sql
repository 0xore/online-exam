-- 5-minute mixed practice exam for local and staging tests.

insert into public.exams (
  id,
  title,
  slug,
  description,
  duration_minutes,
  exam_type,
  published,
  pass_mark,
  settings
) values (
  '11111111-1111-4111-a111-111111111111',
  '5-Minute Practice Exam',
  'practice-5min',
  'A short mixed-type practice paper. Enter your name and email, then you have 5 minutes. Answers are marked as they are saved. Because this paper includes short and long answers, you will see a submission confirmation rather than a score.',
  5,
  'mixed',
  true,
  6,
  '{"randomise_questions": false, "randomise_options": false}'::jsonb
);

insert into public.questions (
  id,
  exam_id,
  position,
  type,
  question_text,
  marks,
  options,
  correct_answer,
  acceptable_answers
) values
(
  '11111111-1111-4111-a111-111111111101',
  '11111111-1111-4111-a111-111111111111',
  1,
  'single_choice',
  'What is 2 + 2?',
  1,
  '[
    {"id":"a","text":"3"},
    {"id":"b","text":"4"},
    {"id":"c","text":"5"},
    {"id":"d","text":"22"}
  ]'::jsonb,
  '"b"'::jsonb,
  null
),
(
  '11111111-1111-4111-a111-111111111102',
  '11111111-1111-4111-a111-111111111111',
  2,
  'multiple_choice',
  'Which of the following numbers are even? Select all that apply.',
  2,
  '[
    {"id":"a","text":"1"},
    {"id":"b","text":"2"},
    {"id":"c","text":"3"},
    {"id":"d","text":"4"}
  ]'::jsonb,
  '["b","d"]'::jsonb,
  null
),
(
  '11111111-1111-4111-a111-111111111103',
  '11111111-1111-4111-a111-111111111111',
  3,
  'true_false',
  'The Earth is approximately spherical.',
  1,
  '[
    {"id":"true","text":"True"},
    {"id":"false","text":"False"}
  ]'::jsonb,
  '"true"'::jsonb,
  null
),
(
  '11111111-1111-4111-a111-111111111104',
  '11111111-1111-4111-a111-111111111111',
  4,
  'short_answer',
  'What is the capital city of France?',
  2,
  null,
  null,
  '["paris"]'::jsonb
),
(
  '11111111-1111-4111-a111-111111111105',
  '11111111-1111-4111-a111-111111111111',
  5,
  'long_answer',
  'In two or three sentences, explain why a server-controlled exam timer is more reliable than a timer that only runs in the browser.',
  4,
  null,
  null,
  null
);

-- 5-minute MCQ practice exam so candidates can see a result after lock.

insert into public.exams (
  id,
  title,
  slug,
  description,
  duration_minutes,
  exam_type,
  published,
  pass_mark,
  settings
) values (
  '22222222-2222-4222-a222-222222222222',
  '5-Minute MCQ Practice',
  'practice-mcq',
  'A short multiple-choice practice paper. After you submit or the timer ends, you will see your automatic score and the correct options.',
  5,
  'mcq',
  true,
  3,
  '{"randomise_questions": false, "randomise_options": false}'::jsonb
);

insert into public.questions (
  id,
  exam_id,
  position,
  type,
  question_text,
  marks,
  options,
  correct_answer,
  acceptable_answers
) values
(
  '22222222-2222-4222-a222-222222222201',
  '22222222-2222-4222-a222-222222222222',
  1,
  'single_choice',
  'What is 2 + 2?',
  1,
  '[
    {"id":"a","text":"3"},
    {"id":"b","text":"4"},
    {"id":"c","text":"5"},
    {"id":"d","text":"22"}
  ]'::jsonb,
  '"b"'::jsonb,
  null
),
(
  '22222222-2222-4222-a222-222222222202',
  '22222222-2222-4222-a222-222222222222',
  2,
  'multiple_choice',
  'Which of the following numbers are even? Select all that apply.',
  2,
  '[
    {"id":"a","text":"1"},
    {"id":"b","text":"2"},
    {"id":"c","text":"3"},
    {"id":"d","text":"4"}
  ]'::jsonb,
  '["b","d"]'::jsonb,
  null
),
(
  '22222222-2222-4222-a222-222222222203',
  '22222222-2222-4222-a222-222222222222',
  3,
  'true_false',
  'The Earth is approximately spherical.',
  1,
  '[
    {"id":"true","text":"True"},
    {"id":"false","text":"False"}
  ]'::jsonb,
  '"true"'::jsonb,
  null
);

-- Randomised MCQ used by Stage 9 security/reliability checks.

insert into public.exams (
  id,
  title,
  slug,
  description,
  duration_minutes,
  exam_type,
  published,
  pass_mark,
  settings
) values (
  '33333333-3333-4333-a333-333333333333',
  'Stage 9 Security Checks',
  'stage9-random',
  'Internal randomised MCQ used to verify resume, expiry, and answer-key isolation.',
  45,
  'mcq',
  true,
  3,
  '{"randomise_questions": true, "randomise_options": true}'::jsonb
);

insert into public.questions (
  id,
  exam_id,
  position,
  type,
  question_text,
  marks,
  options,
  correct_answer,
  acceptable_answers
) values
(
  '33333333-3333-4333-a333-333333333301',
  '33333333-3333-4333-a333-333333333333',
  1,
  'single_choice',
  'Which letter comes first?',
  1,
  '[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}]'::jsonb,
  '"a"'::jsonb,
  null
),
(
  '33333333-3333-4333-a333-333333333302',
  '33333333-3333-4333-a333-333333333333',
  2,
  'single_choice',
  'Which letter comes second?',
  1,
  '[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}]'::jsonb,
  '"b"'::jsonb,
  null
),
(
  '33333333-3333-4333-a333-333333333303',
  '33333333-3333-4333-a333-333333333333',
  3,
  'true_false',
  'Water freezes at 0°C at standard pressure.',
  1,
  '[{"id":"true","text":"True"},{"id":"false","text":"False"}]'::jsonb,
  '"true"'::jsonb,
  null
),
(
  '33333333-3333-4333-a333-333333333304',
  '33333333-3333-4333-a333-333333333333',
  4,
  'single_choice',
  'Which letter comes last?',
  1,
  '[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"},{"id":"d","text":"D"}]'::jsonb,
  '"d"'::jsonb,
  null
);
