<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';

// Verificăm dacă cererea este de tip GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Interogăm baza de date relațională via SQL 
    $stmt = $pdo->query('
        SELECT i.id, i.name, i.quantity, i.min_threshold, c.name as category_name 
        FROM items i 
        JOIN categories c ON i.category_id = c.id
    ');
    $items = $stmt->fetchAll();
    
    // Returnăm datele în format deschis JSON 
    echo json_encode(['status' => 'success', 'data' => $items]);
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
?>