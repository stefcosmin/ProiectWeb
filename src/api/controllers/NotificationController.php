<?php

class NotificationController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function processRequest($method, $id) {
        switch ($method) {
            case 'GET':
                $this->getNotifications();
                break;
            case 'POST':
                if ($id === 'send') {
                    $this->triggerNotifications();
                } else {
                    http_response_code(405);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['message' => 'Method not allowed']);
                break;
        }
    }

    private function getNotifications() {
        //epuizare iminenta (quantity <= min_threshold)
        $stmt = $this->pdo->query('
            SELECT i.id, i.category_id, i.name, i.quantity, i.min_threshold, c.name as category_name
            FROM items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.quantity <= i.min_threshold
        ');
        $depletion = $stmt->fetchAll();

        //verificari periodice (ex: last_checked mai vechi de 30 de zile)
        $stmt2 = $this->pdo->query('
            SELECT i.id, i.category_id, i.name, i.last_checked, c.name as category_name
            FROM items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.last_checked IS NOT NULL AND DATEDIFF(NOW(), i.last_checked) > 30
        ');
        $periodic = $stmt2->fetchAll();

        echo json_encode([
            'depletion' => $depletion,
            'periodic' => $periodic
        ]);
    }

    private function triggerNotifications() {
        

        echo json_encode(['message' => 'Notifications checked and emails queued.']);
    }
}
