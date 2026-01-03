-- Fix seed_forge_data function to explicitly cast target_user_id in all comparisons
-- This ensures compatibility even if Supabase RPC passes UUID type

CREATE OR REPLACE FUNCTION seed_forge_data(target_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{"characters": 0, "worlds": 0, "stories": 0, "magic": 0, "factions": 0, "lore": 0}'::JSONB;
  char_count INT := 0;
  world_count INT := 0;
  story_count INT := 0;
  magic_count INT := 0;
  faction_count INT := 0;
  lore_count INT := 0;
  -- Explicitly cast parameter to TEXT to ensure type consistency
  user_id_text TEXT := target_user_id::TEXT;
BEGIN
  -- Seed Characters
  INSERT INTO notion_characters_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    name,
    description,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    name,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'Aeliana Shadowweaver',
        'A mysterious elven mage who walks between light and shadow. Her silver hair shimmers with starlight, and her eyes hold ancient secrets.',
        '{
          "Race": {"select": {"name": "Elf"}},
          "Age": {"number": 342},
          "Class": {"select": {"name": "Sorcerer"}},
          "Alignment": {"select": {"name": "Chaotic Neutral"}},
          "Status": {"select": {"name": "Alive"}},
          "Skills": {"multi_select": [{"name": "Shadow Magic"}, {"name": "Ancient Lore"}, {"name": "Stealth"}]},
          "Background": {"rich_text": [{"plain_text": "Born in the twilight realm, Aeliana discovered her shadow magic at a young age. She has spent centuries studying forbidden texts and walking the line between light and darkness."}]},
          "Goals": {"rich_text": [{"plain_text": "Uncover the truth behind the Shadowfall prophecy and prevent the coming darkness."}]}
        }'::JSONB
      ),
      (
        'Thorin Ironforge',
        'A stalwart dwarf warrior with a heart of gold and a hammer of steel. His beard is braided with iron rings, and his armor bears the marks of countless battles.',
        '{
          "Race": {"select": {"name": "Dwarf"}},
          "Age": {"number": 87},
          "Class": {"select": {"name": "Paladin"}},
          "Alignment": {"select": {"name": "Lawful Good"}},
          "Status": {"select": {"name": "Alive"}},
          "Skills": {"multi_select": [{"name": "Combat"}, {"name": "Smithing"}, {"name": "Leadership"}]},
          "Background": {"rich_text": [{"plain_text": "Thorin hails from the mountain stronghold of Ironforge. He took up the hammer after his father fell defending the mines from dark creatures."}]},
          "Goals": {"rich_text": [{"plain_text": "Restore honor to his clan and protect the innocent from evil."}]}
        }'::JSONB
      ),
      (
        'Lyra Starwhisper',
        'A half-elf bard whose songs can heal wounds and inspire courage. Her lute is carved from moonwood, and her voice carries the power of the stars.',
        '{
          "Race": {"select": {"name": "Half-Elf"}},
          "Age": {"number": 28},
          "Class": {"select": {"name": "Bard"}},
          "Alignment": {"select": {"name": "Chaotic Good"}},
          "Status": {"select": {"name": "Alive"}},
          "Skills": {"multi_select": [{"name": "Performance"}, {"name": "Healing Magic"}, {"name": "Persuasion"}]},
          "Background": {"rich_text": [{"plain_text": "Lyra was raised by traveling performers. She discovered her magical gift when her songs began to manifest real effects."}]},
          "Goals": {"rich_text": [{"plain_text": "Spread hope and joy through her music, and find the legendary Song of Creation."}]}
        }'::JSONB
      )
  ) AS seed_data(name, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_characters_sync 
    WHERE user_id = user_id_text
    AND name = seed_data.name
  );
  
  GET DIAGNOSTICS char_count = ROW_COUNT;
  result := jsonb_set(result, '{characters}', to_jsonb(char_count));

  -- Seed Worlds
  INSERT INTO notion_worlds_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    name,
    description,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    name,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'Aetheria',
        'A floating continent suspended in the astral plane, where magic flows like rivers and ancient dragons guard the sky-cities.',
        '{
          "Type": {"select": {"name": "Continent"}},
          "Climate": {"select": {"name": "Temperate"}},
          "Magic Level": {"select": {"name": "High"}},
          "Population": {"number": 5000000},
          "Notable Features": {"multi_select": [{"name": "Floating Cities"}, {"name": "Dragon Sanctuaries"}, {"name": "Mana Wells"}]},
          "History": {"rich_text": [{"plain_text": "Aetheria was torn from the material plane during the Great Sundering. Now it drifts through the astral sea, connected to other realms only by magical portals."}]},
          "Current Events": {"rich_text": [{"plain_text": "The Sky Council debates opening trade routes with the material plane, while ancient dragons grow restless."}]}
        }'::JSONB
      ),
      (
        'The Shadowlands',
        'A realm of perpetual twilight where the boundaries between life and death blur. Ghostly cities echo with memories of the past.',
        '{
          "Type": {"select": {"name": "Realm"}},
          "Climate": {"select": {"name": "Eternal Twilight"}},
          "Magic Level": {"select": {"name": "Very High"}},
          "Population": {"number": 0},
          "Notable Features": {"multi_select": [{"name": "Necromantic Energy"}, {"name": "Memory Echoes"}, {"name": "Shadow Portals"}]},
          "History": {"rich_text": [{"plain_text": "The Shadowlands were created when the God of Death sealed away the souls of an entire civilization. Now they exist in a state between life and death."}]},
          "Current Events": {"rich_text": [{"plain_text": "A rift has opened, allowing the living to enter. Some seek lost loved ones, others seek forbidden knowledge."}]}
        }'::JSONB
      )
  ) AS seed_data(name, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_worlds_sync 
    WHERE user_id = user_id_text
    AND name = seed_data.name
  );
  
  GET DIAGNOSTICS world_count = ROW_COUNT;
  result := jsonb_set(result, '{worlds}', to_jsonb(world_count));

  -- Seed Stories
  INSERT INTO notion_stories_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    title,
    description,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    title,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'The Shadowfall Prophecy',
        'An ancient prophecy foretells the coming of a great darkness. A group of unlikely heroes must unite to prevent the end of all things.',
        '{
          "Status": {"select": {"name": "In Progress"}},
          "Genre": {"select": {"name": "Epic Fantasy"}},
          "Word Count": {"number": 45000},
          "Chapters": {"number": 12},
          "Tags": {"multi_select": [{"name": "Prophecy"}, {"name": "Dark Fantasy"}, {"name": "Heroes Journey"}]},
          "Synopsis": {"rich_text": [{"plain_text": "When the stars align and shadows lengthen, five heroes from different realms must come together to prevent the Shadowfall - an event that will plunge all worlds into eternal darkness."}]},
          "Main Characters": {"rich_text": [{"plain_text": "Aeliana Shadowweaver, Thorin Ironforge, Lyra Starwhisper"}]}
        }'::JSONB
      ),
      (
        'Tales from Aetheria',
        'A collection of short stories exploring the floating continent of Aetheria, its sky-cities, and the dragons that guard them.',
        '{
          "Status": {"select": {"name": "Planning"}},
          "Genre": {"select": {"name": "Fantasy Anthology"}},
          "Word Count": {"number": 0},
          "Chapters": {"number": 0},
          "Tags": {"multi_select": [{"name": "Short Stories"}, {"name": "World Building"}, {"name": "Dragons"}]},
          "Synopsis": {"rich_text": [{"plain_text": "A series of interconnected tales that explore different aspects of life in Aetheria, from the sky-cities to the dragon sanctuaries."}]},
          "Main Characters": {"rich_text": [{"plain_text": "Various characters from Aetheria"}]}
        }'::JSONB
      )
  ) AS seed_data(title, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_stories_sync 
    WHERE user_id = user_id_text
    AND title = seed_data.title
  );
  
  GET DIAGNOSTICS story_count = ROW_COUNT;
  result := jsonb_set(result, '{stories}', to_jsonb(story_count));

  -- Seed Magic Systems (notion_pages_sync)
  INSERT INTO notion_pages_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    database_name,
    title,
    content,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    'Magic Systems',
    title,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'Shadow Magic',
        'Shadow Magic draws power from the spaces between light and darkness. Practitioners can manipulate shadows, travel through them, and even create shadow constructs.',
        '{
          "Type": {"select": {"name": "Elemental"}},
          "Difficulty": {"select": {"name": "Advanced"}},
          "Source": {"select": {"name": "Dimensional"}},
          "Users": {"multi_select": [{"name": "Sorcerers"}, {"name": "Warlocks"}]},
          "Limitations": {"rich_text": [{"plain_text": "Requires darkness or shadow to cast. Cannot be used in pure light. Overuse can cause the caster to become part shadow."}]},
          "History": {"rich_text": [{"plain_text": "Discovered during the Great Sundering when the Shadowlands were created. Many consider it forbidden magic."}]}
        }'::JSONB
      ),
      (
        'Song Magic',
        'A form of magic that channels power through music and performance. Skilled bards can heal wounds, inspire courage, and even alter reality with their songs.',
        '{
          "Type": {"select": {"name": "Performance"}},
          "Difficulty": {"select": {"name": "Moderate"}},
          "Source": {"select": {"name": "Emotional"}},
          "Users": {"multi_select": [{"name": "Bards"}, {"name": "Artists"}]},
          "Limitations": {"rich_text": [{"plain_text": "Requires the caster to perform. Cannot be used silently. Power scales with audience size and emotional connection."}]},
          "History": {"rich_text": [{"plain_text": "Ancient magic passed down through generations of traveling performers. The legendary Song of Creation is said to be the source of all Song Magic."}]}
        }'::JSONB
      )
  ) AS seed_data(title, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_pages_sync 
    WHERE user_id = user_id_text
    AND database_name = 'Magic Systems'
    AND title = seed_data.title
  );
  
  GET DIAGNOSTICS magic_count = ROW_COUNT;
  result := jsonb_set(result, '{magic}', to_jsonb(magic_count));

  -- Seed Factions (notion_pages_sync)
  INSERT INTO notion_pages_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    database_name,
    title,
    content,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    'Factions & Organizations',
    title,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'The Sky Council',
        'The governing body of Aetheria, composed of representatives from each sky-city. They maintain order and mediate disputes between the floating settlements.',
        '{
          "Type": {"select": {"name": "Government"}},
          "Alignment": {"select": {"name": "Lawful Neutral"}},
          "Size": {"select": {"name": "Large"}},
          "Influence": {"number": 9},
          "Members": {"multi_select": [{"name": "City Representatives"}, {"name": "Dragon Ambassadors"}]},
          "Goals": {"rich_text": [{"plain_text": "Maintain peace among sky-cities, regulate trade, and protect Aetheria from external threats."}]},
          "History": {"rich_text": [{"plain_text": "Formed after the Great Sundering to govern the newly created floating continent. Has maintained relative peace for three centuries."}]}
        }'::JSONB
      ),
      (
        'The Shadow Walkers',
        'A secretive organization of shadow mages who seek to understand and control the Shadowlands. Many consider them dangerous extremists.',
        '{
          "Type": {"select": {"name": "Secret Society"}},
          "Alignment": {"select": {"name": "Chaotic Neutral"}},
          "Size": {"select": {"name": "Small"}},
          "Influence": {"number": 4},
          "Members": {"multi_select": [{"name": "Shadow Mages"}, {"name": "Necromancers"}]},
          "Goals": {"rich_text": [{"plain_text": "Master shadow magic, explore the Shadowlands, and prevent the Shadowfall prophecy."}]},
          "History": {"rich_text": [{"plain_text": "Founded by the first shadow mages after the Great Sundering. Their methods are often questionable, but their knowledge is unmatched."}]}
        }'::JSONB
      )
  ) AS seed_data(title, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_pages_sync 
    WHERE user_id = user_id_text
    AND database_name = 'Factions & Organizations'
    AND title = seed_data.title
  );
  
  GET DIAGNOSTICS faction_count = ROW_COUNT;
  result := jsonb_set(result, '{factions}', to_jsonb(faction_count));

  -- Seed Lore (notion_pages_sync)
  INSERT INTO notion_pages_sync (
    user_id,
    notion_page_id,
    notion_database_id,
    database_name,
    title,
    content,
    properties,
    created_at,
    updated_at,
    last_synced_at
  )
  SELECT
    user_id_text,
    gen_random_uuid()::TEXT,
    gen_random_uuid()::TEXT,
    'Lore & History',
    title,
    description,
    properties,
    NOW(),
    NOW(),
    NOW()
  FROM (
    VALUES
      (
        'The Great Sundering',
        'A cataclysmic event that tore Aetheria from the material plane and created the Shadowlands. It marked the end of the Age of Unity and the beginning of the Age of Fragmentation.',
        '{
          "Era": {"select": {"name": "Ancient"}},
          "Significance": {"select": {"name": "World-Changing"}},
          "Date": {"rich_text": [{"plain_text": "1,247 years ago"}]},
          "Related Events": {"multi_select": [{"name": "Creation of Aetheria"}, {"name": "Birth of Shadowlands"}, {"name": "Dragon Migration"}]},
          "Details": {"rich_text": [{"plain_text": "When the God of Death attempted to claim all souls, the other gods intervened. The resulting conflict shattered reality, creating Aetheria in the astral plane and the Shadowlands as a realm between life and death."}]},
          "Consequences": {"rich_text": [{"plain_text": "Magic became unstable, dragons fled to Aetheria, and shadow magic was discovered. The world has never fully recovered."}]}
        }'::JSONB
      ),
      (
        'The Shadowfall Prophecy',
        'An ancient prophecy that foretells a time when shadows will consume all light, plunging every realm into eternal darkness.',
        '{
          "Era": {"select": {"name": "Legendary"}},
          "Significance": {"select": {"name": "Apocalyptic"}},
          "Date": {"rich_text": [{"plain_text": "Unknown - Prophecy is ancient"}]},
          "Related Events": {"multi_select": [{"name": "Great Sundering"}, {"name": "Shadow Magic Discovery"}]},
          "Details": {"rich_text": [{"plain_text": "Written in the Book of Shadows by the first shadow mages. It speaks of five heroes who must unite to prevent the coming darkness."}]},
          "Consequences": {"rich_text": [{"plain_text": "Many believe the prophecy is coming true. The Shadow Walkers seek to prevent it, while others believe it is inevitable."}]}
        }'::JSONB
      )
  ) AS seed_data(title, description, properties)
  WHERE NOT EXISTS (
    SELECT 1 FROM notion_pages_sync 
    WHERE user_id = user_id_text
    AND database_name = 'Lore & History'
    AND title = seed_data.title
  );
  
  GET DIAGNOSTICS lore_count = ROW_COUNT;
  result := jsonb_set(result, '{lore}', to_jsonb(lore_count));

  RETURN result;
END;
$$;



