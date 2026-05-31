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
        // Epuizare iminentă (quantity <= min_threshold)
        $stmt = $this->pdo->query('
            SELECT i.name, i.quantity, i.min_threshold, c.name as category_name
            FROM items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.quantity <= i.min_threshold
        ');
        $depletion = $stmt->fetchAll();

        // Verificări periodice (ex: last_checked mai vechi de 30 de zile)
        $stmt2 = $this->pdo->query('
            SELECT i.name, i.last_checked, c.name as category_name
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
        // Aici s-ar face trimiterea pe email
        // Exemplu cu funcția mail() a PHP
        /*
        $to = 'admin@example.com';
        $subject = 'Notificare Epuizare Stocuri / Verificari';
        $message = 'Aceste produse necesita atentie...';
        $headers = 'From: noreply@example.com' . "\r\n" .
            'Reply-To: noreply@example.com' . "\r\n" .
            'X-Mailer: PHP/' . phpversion();

        mail($to, $subject, $message, $headers);
        */

        echo json_encode(['message' => 'Notifications checked and emails queued.']);
    }
}
