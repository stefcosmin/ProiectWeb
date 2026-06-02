CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 0,
    min_threshold INT DEFAULT 5, -- Folosit pentru notificările de epuizare iminentă
    last_checked DATE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Inserăm date de test pentru consumabile și piese 
INSERT INTO categories (name) VALUES ('Altele'), ('Consumabile'), ('Piese de schimb'), ('Unelte'), ('Chimicale'),('Echipamente'),('Materiale curatenie');
INSERT INTO items (category_id, name, quantity, min_threshold) VALUES 
(1, 'Becuri LED', 3, 5),
(1, 'Pahare unică folosință', 100, 20),
(2, 'Filtru ulei auto', 1, 2);